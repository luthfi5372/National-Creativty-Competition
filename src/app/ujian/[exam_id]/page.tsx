'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { generateTicketCode } from '@/lib/utils';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  Bars3Icon,
  PaperAirplaneIcon,
  ShieldExclamationIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

export default function ExamRoom() {
  // 🔥 SOLUSI UTAMA: Mengambil parameter URL dengan aman menggunakan useParams
  const params = useParams();
  const router = useRouter();
  const examId = params?.exam_id as string;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [student, setStudent] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examConfig, setExamConfig] = useState<{
    correct_point: number;
    penalty_point: number;
    empty_point: number;
    scoring_system: string;
  }>({ correct_point: 4, penalty_point: 0, empty_point: 0, scoring_system: 'Fixed' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [doubtfulAnswers, setDoubtfulAnswers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(5400); 

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // 🔥 PENCEGAHAN ERROR: Jangan jalankan query jika ID ujian masih "undefined"
    if (!examId || examId === 'undefined') return;

    // 🔥 PENGUNCI INSTAN LOKAL: Deteksi cache lokal pengerjaan selesai sebelum panggil jaringan
    const isLocalSubmitted = localStorage.getItem(`cbt_submitted_${examId}`) === 'true';
    if (isLocalSubmitted) {
      router.replace('/ujian/dashboard');
      return;
    }

    const savedUser = localStorage.getItem('ncc_user');
    if (!savedUser) {
      router.push('/ujian/login');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    setStudent(parsedUser);

    const loadExamData = async () => {
      try {
        // 1. Ambil durasi, status aktif, dan konfigurasi penilaian
        const { data: examData } = await supabase
          .from('cbt_exams')
          .select('duration, duration_minutes, is_active, correct_point, penalty_point, empty_point, scoring_system, shuffle_questions')
          .eq('id', examId).maybeSingle();
        
        if (!examData || !examData.is_active) {
          localStorage.removeItem('ncc_user');
          router.replace('/ujian/login');
          return;
        }

        if (examData) {
          const duration = examData.duration_minutes || examData.duration;
          if (duration) setTimeLeft(duration * 60);
          // Simpan konfigurasi penilaian ke state
          setExamConfig({
            correct_point: examData.correct_point ?? 4,
            penalty_point: examData.penalty_point ?? 0,
            empty_point: examData.empty_point ?? 0,
            scoring_system: examData.scoring_system || 'Fixed',
          });
        }

        // 2. Ambil soal
        const { data: qData, error: qErr } = await supabase
          .from('cbt_questions')
          .select('*')
          .eq('exam_id', examId)
          .order('created_at', { ascending: true });

        if (qErr) {
          console.error("DATABASE ERROR SOAL:", qErr.message); 
        } else if (qData && qData.length > 0) {
          // shuffle_questions default true jika null/undefined (backward compat)
          const shouldShuffle = examData?.shuffle_questions !== false;
          if (shouldShuffle) {
            const shuffled = [...qData].sort(() => Math.random() - 0.5);
            setQuestions(shuffled);
          } else {
            setQuestions(qData); // urutan tetap sesuai created_at
          }
        }

        // 3. Lapor kehadiran CCTV
        const userId = parsedUser.ticket_code || (parsedUser.id ? `NCC-${generateTicketCode(parsedUser.id)}` : (parsedUser.nisn || parsedUser.username));
        const { data: existingUser, error: checkErr } = await supabase
          .from('cbt_attempts')
          .select('*')
          .eq('user_id', userId)
          .eq('exam_id', examId)
          .maybeSingle();

        if (existingUser) {
          // 🔥 PROTOKOL PENGUNCI KETAT: Cek status selesai pengerjaan di database
          if (existingUser.submitted_at || existingUser.status === 'submitted') {
            localStorage.setItem(`cbt_submitted_${examId}`, 'true');
            router.replace('/ujian/dashboard');
            return; // Hentikan inisialisasi agar UI tetap loading / redirect instan
          }

          // Restorasi jawaban tersimpan jika terputus/refresh halaman
          if (existingUser.answers) {
            setAnswers(existingUser.answers);
          }

          setViolationCount(existingUser.violations_count || 0);
          if ((existingUser.violations_count || 0) >= 3) setIsBlocked(true);
          await supabase.from('cbt_attempts').update({ updated_at: new Date().toISOString() }).eq('user_id', userId).eq('exam_id', examId);
        } else {
          await supabase.from('cbt_attempts').insert({ 
            user_id: userId, exam_id: examId, violations_count: 0, updated_at: new Date().toISOString() 
          });
        }

      } catch (err: any) {
        console.error("CRASH SISTEM FATAL:", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadExamData();
  }, [examId, router]);

  useEffect(() => {
    if (loading || timeLeft <= 0 || isBlocked) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, isBlocked]);

  // 🔥 RADAR SENSITIVITAS TINGGI
  useEffect(() => {
    const handleCheat = async () => {
      // Jika tab tidak aktif / pindah aplikasi
      if (!isFinished && !isBlocked && student) {
        const newCount = violationCount + 1;
        setViolationCount(newCount);
        
        const cbtUserId = student.ticket_code || (student.id ? `NCC-${generateTicketCode(student.id)}` : (student.nisn || student.username));

        await supabase.from('cbt_attempts').update({ 
          violations_count: newCount,
          updated_at: new Date().toISOString() 
        }).eq('user_id', cbtUserId).eq('exam_id', examId);

        if (newCount >= 3) setIsBlocked(true);
        else setShowCheatWarning(true); 
      }
    };

    const onVisibilityChange = () => { if (document.hidden) handleCheat(); };
    const onWindowBlur = () => { handleCheat(); };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur); // Deteksi saat klik luar browser

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [violationCount, student, isFinished, isBlocked, examId]);

  const handleSelectOption = async (questionId: string, option: string) => {
    const q = questions.find(item => item.id === questionId);
    if (!q) return;

    const isMultiSelect = q.correct_answer && q.correct_answer.length > 1;
    let newOptionValue = '';

    if (isMultiSelect) {
      const currentAns = answers[questionId] || '';
      if (currentAns.includes(option)) {
        newOptionValue = currentAns.replace(option, '');
      } else {
        newOptionValue = currentAns + option;
      }
      // Urutkan alfabetis, misal "C" + "A" => "AC"
      newOptionValue = newOptionValue.split('').sort().join('');
    } else {
      newOptionValue = option;
    }

    const newAnswers = { ...answers, [questionId]: newOptionValue };
    setAnswers(newAnswers);
    if (doubtfulAnswers[questionId]) setDoubtfulAnswers(prev => ({ ...prev, [questionId]: false }));
    const userId = student?.ticket_code || (student?.id ? `NCC-${generateTicketCode(student.id)}` : (student?.nisn || student?.username));
    
    // Keamanan ekstra saat mengirim jawaban
    if (userId && examId && examId !== 'undefined') {
      await supabase.from('cbt_attempts').update({ 
        answers: newAnswers,
        updated_at: new Date().toISOString() 
      }).eq('user_id', userId).eq('exam_id', examId);
    }
  };

  const handleToggleDoubt = () => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    setDoubtfulAnswers(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // 1. Fungsi untuk memunculkan pop-up modern
  const handleOpenSubmitModal = () => {
    setShowSubmitModal(true);
  };

  // 🔥 MESIN SUBMIT & SKOR ULTIMATE
  const confirmSubmitExam = async () => {
    setShowSubmitModal(false);

    try {
      // 1. Hitung Skor berdasarkan konfigurasi admin (correct_point / penalty_point / empty_point)
      let finalScore = 0;
      if (questions.length > 0) {
        const { correct_point, penalty_point, empty_point } = examConfig;
        questions.forEach(q => {
          const userAnswer = answers[q.id] || '';
          const qType = q.options?.type || 'pg';

          if (qType === 'isian') {
            if (!userAnswer) {
              finalScore += empty_point;
            } else {
              const correctAnswers = String(q.correct_answer || '').toUpperCase().split('|').map(x => x.trim());
              const studentAns = String(userAnswer).trim().toUpperCase();
              if (correctAnswers.includes(studentAns)) {
                finalScore += Number(q.options?.points?.correct ?? 4);
              } else {
                finalScore += penalty_point <= 0 ? penalty_point : -penalty_point;
              }
            }
          } else if (qType === 'essay') {
            const grades = (answers as any).essay_grades || {};
            const score = Number(grades[q.id] || 0);
            finalScore += score;
          } else {
            // Cek jika ada custom option points di q.options.points
            if (q.options && typeof q.options === 'object' && q.options.points) {
              if (!userAnswer) {
                finalScore += empty_point;
              } else {
                const selectedLetters = userAnswer.split('');
                selectedLetters.forEach((l: string) => {
                  const pt = q.options.points[l];
                  if (pt !== undefined) {
                    finalScore += Number(pt);
                  }
                });
              }
            } else {
              // Penilaian standar
              const correct = String(q.correct_answer || '').trim().toUpperCase();
              const user    = String(userAnswer).trim().toUpperCase();

              if (!user) {
                // Soal tidak dijawab
                finalScore += empty_point;
              } else if (user === correct) {
                // Jawaban benar
                finalScore += correct_point;
              } else {
                // Jawaban salah — penalty_point biasanya negatif atau 0
                finalScore += penalty_point <= 0 ? penalty_point : -penalty_point;
              }
            }
          }
        });
      }
      finalScore = Math.max(0, Math.round(finalScore * 100) / 100);

      // 2. Kirim Data ke Pusat Komando
      const userId = student?.ticket_code || (student?.id ? `NCC-${generateTicketCode(student.id)}` : (student?.nisn || student?.username));
      if (userId && examId && examId !== 'undefined') {
        const { error } = await supabase.from('cbt_attempts').update({
          submitted_at: new Date().toISOString(),
          status: 'submitted', // Set status secara eksplisit
          score: finalScore,
          final_score: finalScore,
          answers: answers, // Kirim juga rekaman jawaban mentah
          updated_at: new Date().toISOString()
        }).eq('user_id', userId).eq('exam_id', examId);
        
        if (error) throw error;

        // Simpan status submit secara lokal agar cepat terdeteksi tanpa kueri jaringan
        localStorage.setItem(`cbt_submitted_${examId}`, 'true');
      }

      // 3. Pemicu Animasi Sukses
      setIsFinished(true); // Memanggil layar biru "BERHASIL TERKIRIM"

      // 4. Jeda 4 detik agar peserta lega, lalu lempar ke Dashboard dengan "Surat Pengantar" (status=success)
      setTimeout(() => {
        router.replace('/ujian/dashboard?status=success'); 
      }, 4000);
    } catch (error: any) {
      alert("GAGAL MENGIRIM DATA: " + error.message);
    }
  };

  // 🔥 AUTO SUBMIT BILA WAKTU HABIS
  useEffect(() => {
    if (!loading && timeLeft === 0 && !isFinished && !isBlocked) {
      console.log("[CBT LLMS] Waktu pengerjaan habis! Menyerahkan lembar jawaban secara otomatis...");
      confirmSubmitExam();
    }
  }, [timeLeft, loading, isFinished, isBlocked]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fe] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-[#5145cd] rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-[#5145cd] uppercase tracking-widest">Membangun Ruang Ujian Enkripsi...</p>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white max-w-lg w-full rounded-[40px] p-10 text-center shadow-2xl border border-rose-100">
          <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockClosedIcon className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">SESI UJIAN DIBLOKIR</h1>
          <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed">
            Anda telah melanggar protokol integritas ujian sebanyak <span className="text-rose-600 font-black">3 KALI</span>. Sistem telah mengunci akses ujian Anda secara permanen.
          </p>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 mb-8 text-left space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instruksi Selanjutnya:</p>
            <p className="text-xs font-semibold text-gray-700">1. Segera lapor ke Pengawas/Panitia Pusat NCC.</p>
            <p className="text-xs font-semibold text-gray-700">2. Sebutkan NISN Anda untuk proses verifikasi pembukaan blokir.</p>
          </div>
          <button onClick={() => router.push('/ujian/dashboard')} className="w-full py-4 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all">
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#f4f7fe] font-sans text-gray-800 select-none pb-10 relative">
      
      {showCheatWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-2xl border-4 border-rose-500 text-center transform scale-100 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldExclamationIcon className="w-14 h-14 text-rose-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">PELANGGARAN TERDETEKSI</h2>
            <p className="text-sm font-bold text-gray-500 mt-3 leading-relaxed">
              Sistem keamanan mendeteksi Anda keluar dari layar ujian atau menekan <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-mono text-xs">Alt+Tab</span>.
            </p>
            <div className="mt-6 p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Status Pusat Komando</p>
              <p className="text-xs font-bold text-rose-500 mt-1">Sinyal Peringatan ke-{violationCount} Telah Dikirim ke Layar Pengawas!</p>
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-3 pt-3 border-t border-rose-200">
                ⚠️ Peringatan: Pada pelanggaran ke-3, ujian akan diblokir.
              </p>
            </div>
            <button onClick={() => setShowCheatWarning(false)} className="w-full mt-8 py-4 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-200">
              Saya Mengerti & Tidak Akan Mengulangi
            </button>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 md:p-10 max-w-sm w-full shadow-2xl text-center transform scale-100 animate-in zoom-in duration-300 border border-gray-100">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <PaperAirplaneIcon className="w-10 h-10 text-[#5145cd] ml-1" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Kirim Jawaban?</h2>
            <p className="text-xs font-bold text-gray-500 mt-3 leading-relaxed">
              Pastikan semua soal telah terjawab. Anda tidak akan bisa kembali ke ruang ujian setelah menekan tombol kirim.
            </p>
            <div className="mt-8 flex space-x-3">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                Batal
              </button>
              <button onClick={confirmSubmitExam} className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-200">
                Ya, Selesai!
              </button>
            </div>
          </div>
        </div>
      )}

      {isFinished && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#5145cd] text-white p-4 animate-in fade-in zoom-in duration-500">
          <CheckCircleIcon className="w-24 h-24 mb-6 text-emerald-300 animate-bounce" />
          <h1 className="text-4xl font-black tracking-tight mb-2 text-center">Ujian Selesai!</h1>
          <p className="text-sm font-bold text-indigo-200 text-center max-w-md leading-relaxed mb-8">
            Terima kasih telah berpartisipasi dengan jujur. Jawaban Anda telah dienkripsi dan diamankan di pangkalan data kami.
          </p>
          <div className="w-48 h-2 bg-indigo-900 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full animate-[progress_4s_ease-in-out_forwards]" style={{ width: '100%', animationName: 'progress-bar' }}>
              <style>{`
                @keyframes progress-bar {
                  0% { width: 0%; }
                  100% { width: 100%; }
                }
              `}</style>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest mt-4 text-indigo-300 animate-pulse">Kembali ke dashboard...</p>
        </div>
      )}

      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-[#5145cd] text-white rounded-xl flex items-center justify-center font-black text-lg shadow-inner">N</div>
          <div className="hidden md:block">
            <h1 className="text-sm font-black text-gray-900 leading-tight">{student?.active_exam_title || 'Olimpiade MIPA'}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{student?.full_name || 'Peserta'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 md:space-x-8">
          <div className="flex items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full">
            <ClockIcon className={`w-5 h-5 mr-2 ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-[#5145cd]'}`} />
            <span className={`font-mono font-black text-lg tracking-widest ${timeLeft < 300 ? 'text-rose-600' : 'text-[#5145cd]'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <button onClick={handleOpenSubmitModal} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center">
            <CheckCircleIcon className="w-4 h-4 mr-2" /> Selesai
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        <div className="lg:col-span-3 space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white p-10 rounded-[32px] text-center border border-gray-100 shadow-sm">
              <ExclamationTriangleIcon className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-black text-gray-800">Bank Soal Kosong</h2>
            </div>
          ) : (
            <div className="bg-white p-6 md:p-10 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] min-h-[500px] flex flex-col relative">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                 <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-black tracking-widest">
                   SOAL NO. {currentIndex + 1}
                 </span>
              </div>

              <div className="flex-1">
                <p className="text-lg font-medium text-gray-800 leading-relaxed mb-6 whitespace-pre-wrap">
                  {currentQ.question_text || 'Deskripsi soal tidak tersedia.'}
                </p>
                {currentQ.image_url && <img src={currentQ.image_url} alt="Ilustrasi Soal" className="max-w-full h-auto rounded-xl border border-gray-100 mb-6 shadow-sm" />}

                 <div className="space-y-3 mt-8">
                  {(() => {
                    const qType = currentQ.options?.type || 'pg';
                    if (qType === 'isian') {
                      return (
                        <div className="w-full space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left">Tulis Jawaban Singkat Anda:</label>
                          <input
                            type="text"
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => {
                              setAnswers({ ...answers, [currentQ.id]: e.target.value });
                              if (doubtfulAnswers[currentQ.id]) setDoubtfulAnswers(prev => ({ ...prev, [currentQ.id]: false }));
                            }}
                            onBlur={async () => {
                              const val = answers[currentQ.id] || '';
                              const userId = student?.ticket_code || (student?.id ? `NCC-${generateTicketCode(student.id)}` : (student?.nisn || student?.username));
                              if (userId && examId && examId !== 'undefined') {
                                await supabase.from('cbt_attempts').update({ 
                                  answers: { ...answers, [currentQ.id]: val },
                                  updated_at: new Date().toISOString() 
                                }).eq('user_id', userId).eq('exam_id', examId);
                              }
                            }}
                            placeholder="Ketik jawaban Anda di sini..."
                            className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-[#5145cd] font-medium text-sm transition-all shadow-sm"
                          />
                        </div>
                      );
                    }
                    if (qType === 'essay') {
                      return (
                        <div className="w-full space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left">Tulis Jawaban Essay Anda:</label>
                          <textarea
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => {
                              setAnswers({ ...answers, [currentQ.id]: e.target.value });
                              if (doubtfulAnswers[currentQ.id]) setDoubtfulAnswers(prev => ({ ...prev, [currentQ.id]: false }));
                            }}
                            onBlur={async () => {
                              const val = answers[currentQ.id] || '';
                              const userId = student?.ticket_code || (student?.id ? `NCC-${generateTicketCode(student.id)}` : (student?.nisn || student?.username));
                              if (userId && examId && examId !== 'undefined') {
                                await supabase.from('cbt_attempts').update({ 
                                  answers: { ...answers, [currentQ.id]: val },
                                  updated_at: new Date().toISOString() 
                                }).eq('user_id', userId).eq('exam_id', examId);
                              }
                            }}
                            placeholder="Tulis jawaban essay Anda secara lengkap di sini..."
                            className="w-full h-48 p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-[#5145cd] font-medium text-sm transition-all resize-none shadow-sm"
                          />
                        </div>
                      );
                    }
                    
                    // PG
                    const hasOptions = currentQ.options && Object.keys(currentQ.options).length > 0;
                    if (!hasOptions) {
                      return (
                        <div className="w-full p-5 bg-amber-50 border-2 border-amber-200 border-dashed rounded-2xl flex items-center text-amber-600">
                          <ExclamationTriangleIcon className="w-6 h-6 mr-3 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">Opsi Kosong</p>
                          </div>
                        </div>
                      );
                    }

                    return Object.keys(currentQ.options)
                      .filter(key => key.length === 1 && key >= 'A' && key <= 'Z')
                      .sort()
                      .map((letter) => {
                        const optionText = currentQ.options[letter] || currentQ.options[letter.toLowerCase()];
                        if (!optionText) return null; 
                        const isMultiSelect = currentQ.correct_answer && currentQ.correct_answer.length > 1;
                        const isSelected = isMultiSelect 
                          ? (answers[currentQ.id] || '').includes(letter)
                          : answers[currentQ.id] === letter;
                        return (
                          <button
                            key={letter}
                            onClick={() => handleSelectOption(currentQ.id, letter)}
                            className={`w-full flex items-center p-4 rounded-2xl border-2 transition-all text-left group
                              ${isSelected ? 'border-[#5145cd] bg-indigo-50/50 shadow-md scale-[1.01]' : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50'}`}
                          >
                            <div className={`w-8 h-8 ${isMultiSelect ? 'rounded-lg' : 'rounded-full'} flex items-center justify-center text-sm font-black mr-4 transition-colors flex-shrink-0
                              ${isSelected ? 'bg-[#5145cd] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-[#5145cd]'}`}>
                              {letter}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>{optionText}</span>
                          </button>
                        );
                      });
                  })()}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center mt-10 pt-6 border-t border-gray-50 gap-4">
                <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="w-full md:w-auto px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all">
                  Sebelumnya
                </button>
                <label className="w-full md:w-auto flex items-center justify-center space-x-3 cursor-pointer bg-amber-50 px-6 py-3 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors">
                  <input type="checkbox" checked={!!doubtfulAnswers[currentQ.id]} onChange={handleToggleDoubt} className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500 border-amber-300" />
                  <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Ragu - Ragu</span>
                </label>
                {currentIndex === questions.length - 1 ? (
                  <button onClick={handleOpenSubmitModal} className="w-full md:w-auto px-6 py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200 flex items-center justify-center">
                    Kirim & Selesai <PaperAirplaneIcon className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))} className="w-full md:w-auto px-6 py-3 bg-[#5145cd] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#3d32a8] transition-all shadow-md shadow-indigo-200">
                    Selanjutnya
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] sticky top-24">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center">
              <Bars3Icon className="w-5 h-5 mr-2" /> Peta Soal
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const hasAnswered = !!answers[q.id];
                const isDoubtful = !!doubtfulAnswers[q.id];
                const isCurrent = idx === currentIndex;
                
                let btnStyle = "bg-gray-100 text-gray-500 border-transparent hover:border-indigo-200"; 
                if (isDoubtful) btnStyle = "bg-amber-400 text-white border-amber-500 shadow-sm"; 
                else if (hasAnswered) btnStyle = "bg-[#5145cd] text-white border-[#5145cd] shadow-sm"; 
                if (isCurrent) btnStyle += " scale-110 ring-2 ring-offset-1 ring-gray-800 z-10"; 
                
                return (
                  <button key={q.id} onClick={() => setCurrentIndex(idx)} className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all border-2 ${btnStyle}`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
