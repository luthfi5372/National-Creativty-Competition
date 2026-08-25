// File: app/api/admin/llms/grading/route.ts
// ============================================================================
// API ADMIN: Kalkulator Penilai Otomatis (Auto-Grading Engine)
// ============================================================================
// Sistem penilaian fleksibel yang mendukung 3 mode:
//   1. Fixed:   Semua soal bernilai sama (+4 poin per benar)
//   2. Custom:  Setiap soal punya bobot berbeda (dari kolom weight)
//   3. Penalty: Benar mendapat poin, salah dikenai penalti minus
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getQuestionMaxPoints(q: any, fixedCorrectPoint: number): number {
  const qType = q.options?.type || 'pg';
  if (qType === 'pg') {
    if (q.options?.points && typeof q.options.points === 'object') {
      const values = Object.values(q.options.points).map(Number);
      if (values.length > 0) {
        return Math.max(...values);
      }
    }
    return q.weight && q.weight !== 1 ? q.weight : fixedCorrectPoint;
  } else if (qType === 'isian') {
    return Number(q.options?.points?.correct ?? (q.weight && q.weight !== 1 ? q.weight : fixedCorrectPoint));
  } else if (qType === 'essay') {
    return Number(q.options?.points?.correct ?? (q.weight && q.weight !== 1 ? q.weight : 10));
  }
  return q.weight && q.weight !== 1 ? q.weight : fixedCorrectPoint;
}

/**
 * POST /api/admin/llms/grading
 * Menghitung skor akhir peserta berdasarkan jawaban yang tersimpan.
 * 
 * Body: { "attempt_id": "uuid-dari-cbt_attempts", "essay_grades": { ... } }
 * 
 * Alur kalkulasi:
 * 1. Update nilai essay jika disertakan di body (menggunakan service_role)
 * 2. Ambil semua jawaban peserta dari cbt_answers
 * 3. Cocokkan dengan kunci jawaban di cbt_questions
 * 4. Hitung skor berdasarkan scoring_system ujian
 * 5. Update skor akhir di cbt_attempts
 */
export async function POST(request: Request) {
  try {
    const { attempt_id, essay_grades } = await request.json();

    if (!attempt_id) {
      return NextResponse.json(
        { success: false, error: "Parameter attempt_id wajib diisi." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = serviceRoleKey 
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
      : await createClient();

    // ── STEP 1: Ambil data attempt & konfigurasi ujian ──
    const { data: attempt, error: attemptErr } = await supabase
      .from('cbt_attempts')
      .select('*, cbt_exams(*)')
      .eq('id', attempt_id)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json(
        { success: false, error: "Sesi ujian peserta tidak ditemukan." },
        { status: 404 }
      );
    }

    // Jika essay_grades dikirim, lakukan update ke database terlebih dahulu
    if (essay_grades) {
      const updatedAnswers = {
        ...(attempt.answers || {}),
        essay_grades: essay_grades
      };

      const { error: updateError } = await supabase
        .from('cbt_attempts')
        .update({
          answers: updatedAnswers,
          updated_at: new Date().toISOString()
        })
        .eq('id', attempt_id);

      if (updateError) throw updateError;
      attempt.answers = updatedAnswers;
    }

    const exam = attempt.cbt_exams;
    const scoringSystem: string = exam?.scoring_system || 'Custom';
    const fixedCorrectPoint: number = exam?.correct_point || 4;
    const penaltyPoint: number = exam?.penalty_point || 0;
    const emptyPoint: number = exam?.empty_point || 0;

    // ── STEP 2: Ambil semua jawaban peserta dari cbt_attempts.answers ──
    const studentAnswersObj = attempt.answers || {};
    const answers = Object.entries(studentAnswersObj)
      .filter(([key]) => key !== 'essay_grades')
      .map(([question_id, selected_option]) => ({
        question_id,
        selected_option: String(selected_option)
      }));

    if (!answers || answers.length === 0) {
      // Peserta tidak menjawab sama sekali
      await supabase
        .from('cbt_attempts')
        .update({ final_score: 0, status: 'submitted', finished_at: new Date().toISOString() })
        .eq('id', attempt_id);

      return NextResponse.json({
        success: true,
        score: 0,
        detail: { correct: 0, wrong: 0, unanswered: 0, method: scoringSystem },
        message: "Peserta tidak menjawab satupun soal."
      });
    }

    // ── STEP 3: Ambil kunci jawaban & bobot dari bank soal ──
    const questionIds = answers.map(a => a.question_id);
    const { data: questions, error: qErr } = await supabase
      .from('cbt_questions')
      .select('id, correct_answer, weight, options')
      .in('id', questionIds);

    if (qErr) throw qErr;

    // Buat lookup map untuk O(1) access
    const keyMap = new Map<string, { correct_answer: string; weight: number; options?: any }>();
    (questions || []).forEach(q => keyMap.set(q.id, q));

    // ── STEP 4: Hitung skor berdasarkan scoring_system ──
    let totalEarned = 0;
    let totalMaximum = 0;
    let correctCount = 0;
    let wrongCount = 0;

    // Hitung total bobot maksimum (semua soal dalam ujian, bukan hanya yang dijawab)
    const { data: allQuestions } = await supabase
      .from('cbt_questions')
      .select('weight, options')
      .eq('exam_id', exam.id)
      .eq('status', 'Published');

    const totalQuestionsCount = allQuestions?.length || 0;
    let answeredQuestionsCount = 0;

    answers.forEach(answer => {
      const key = keyMap.get(answer.question_id);
      if (!key) return;

      const qType = key.options?.type || 'pg';

      if (qType === 'essay') {
        const grades = (attempt as any)?.answers?.essay_grades || {};
        const score = Number(grades[answer.question_id] || 0);
        totalEarned += score;
        if (score > 0) correctCount++;
        if (answer.selected_option && String(answer.selected_option).trim() !== "") {
          answeredQuestionsCount++;
        }
      } else if (answer.selected_option && answer.selected_option !== "") {
        answeredQuestionsCount++;
        
        if (qType === 'isian') {
          const correctAnswers = String(key.correct_answer || '').toUpperCase().split('|').map(x => x.trim());
          const studentAns = String(answer.selected_option).trim().toUpperCase();
          if (correctAnswers.includes(studentAns)) {
            totalEarned += Number(key.options?.points?.correct ?? fixedCorrectPoint ?? 4);
            correctCount++;
          } else {
            wrongCount++;
            if (scoringSystem === 'Penalty') {
              totalEarned += penaltyPoint < 0 ? penaltyPoint : -penaltyPoint;
            }
          }
        } else {
          // PG
          // Cek jika ada custom option points di key.options.points
          if (key.options && typeof key.options === 'object' && key.options.points) {
            const selectedLetters = String(answer.selected_option || '').split('');
            let questionPoints = 0;
            selectedLetters.forEach((l: string) => {
              const pt = key.options.points[l];
              if (pt !== undefined) {
                questionPoints += Number(pt);
              }
            });
            totalEarned += questionPoints;
            
            // Anggap benar jika poin yang diperoleh positif
            if (questionPoints > 0) {
              correctCount++;
            } else {
              wrongCount++;
            }
          } else {
            const isCorrect = answer.selected_option === key.correct_answer;

            if (isCorrect) {
              correctCount++;
              switch (scoringSystem) {
                case 'Fixed':
                  totalEarned += fixedCorrectPoint;
                  break;
                case 'Custom':
                  totalEarned += key.weight;
                  break;
                case 'Penalty':
                  totalEarned += fixedCorrectPoint;
                  break;
              }
            } else {
              wrongCount++;
              if (scoringSystem === 'Penalty') {
                totalEarned += penaltyPoint < 0 ? penaltyPoint : -penaltyPoint;
              }
            }
          }
        }
      }
    });

    // Tambahkan empty point untuk soal yang tidak dijawab
    const unanswered = totalQuestionsCount - answeredQuestionsCount;
    if (emptyPoint !== 0) {
      totalEarned += (unanswered * emptyPoint);
    }

    // Hitung total bobot maksimum berdasarkan akumulasi custom points per soal
    (allQuestions || []).forEach(q => {
      totalMaximum += getQuestionMaxPoints(q, fixedCorrectPoint);
    });

    // Hitung skor akhir berdasarkan akumulasi poin admin (raw score, tidak dipaksa ke skala 100)
    const finalScore = Math.max(0, Math.round(totalEarned * 100) / 100);

    // ── STEP 5: Simpan skor akhir ke database ──
    const { error: updateErr } = await supabase
      .from('cbt_attempts')
      .update({
        final_score: finalScore,
        score: finalScore,
        current_score: Math.round(finalScore),
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', attempt_id);

    if (updateErr) throw updateErr;

    // ── STEP 6: Kembalikan hasil lengkap ──

    return NextResponse.json({
      success: true,
      score: finalScore,
      detail: {
        correct: correctCount,
        wrong: wrongCount,
        unanswered,
        total_questions: totalQuestionsCount,
        raw_earned: totalEarned,
        raw_maximum: totalMaximum,
        method: scoringSystem,
        penalty_applied: scoringSystem === 'Penalty' ? wrongCount * (penaltyPoint < 0 ? -penaltyPoint : penaltyPoint) : 0
      },
      message: `Penilaian selesai dengan metode ${scoringSystem}. Skor: ${finalScore}`
    });

  } catch (error: any) {
    console.error("GAGAL MENILAI:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan pada proses penilaian." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/llms/grading?exam_id=xxx
 * Mengambil leaderboard/ranking peserta untuk sesi ujian tertentu.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('exam_id');

    if (!examId) {
      return NextResponse.json(
        { success: false, error: "Parameter exam_id wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Ambil konfigurasi ujian
    const { data: exam } = await supabase
      .from('cbt_exams')
      .select('*')
      .eq('id', examId)
      .single();

    // Ambil semua soal dari bank soal yang diterbitkan
    const { data: allQuestions } = await supabase
      .from('cbt_questions')
      .select('weight, options')
      .eq('exam_id', examId)
      .eq('status', 'Published');

    const totalQuestionsCount = allQuestions?.length || 0;
    const scoringSystem = exam?.scoring_system || 'Fixed';
    const fixedCorrectPoint = exam?.correct_point || 4;

    let totalMaximum = 0;
    (allQuestions || []).forEach(q => {
      totalMaximum += getQuestionMaxPoints(q, fixedCorrectPoint);
    });

    const passingThreshold = totalMaximum > 0 ? 0.7 * totalMaximum : 70;

    const { data, error } = await supabase
      .from('cbt_attempts')
      .select('*')
      .eq('exam_id', examId)
      .in('status', ['submitted', 'disqualified'])
      .order('final_score', { ascending: false });

    if (error) throw error;

    // Tambahkan ranking
    const ranked = (data || []).map((item, idx) => ({
      ...item,
      rank: idx + 1,
      passed: item.final_score >= passingThreshold
    }));

    return NextResponse.json({
      success: true,
      data: ranked,
      stats: {
        total_participants: ranked.length,
        passed: ranked.filter(r => r.passed).length,
        failed: ranked.filter(r => !r.passed).length,
        disqualified: ranked.filter(r => r.status === 'disqualified').length,
        average_score: ranked.length > 0
          ? Math.round(ranked.reduce((sum, r) => sum + r.final_score, 0) / ranked.length * 100) / 100
          : 0
      }
    });

  } catch (error: any) {
    console.error("GAGAL AMBIL RANKING:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengambil data ranking." },
      { status: 500 }
    );
  }
}
