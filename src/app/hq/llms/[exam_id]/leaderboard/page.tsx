'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { generateTicketCode } from '@/lib/utils';
import { getAdminCompetitionEntries } from '@/app/actions/auth';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  ShieldAlert,
  Search,
  Download,
  Clock,
  RefreshCw,
  BookOpen,
  X,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Trash2,
  Info,
  Hourglass,
  Check,
  AlertTriangle,
  ClipboardList,
  Star,
  Lightbulb,
  Pin,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveLeaderboard() {
  const supabase = createClient();
  const params = useParams();
  const examId = params.exam_id as string;

  const [attempts, setAttempts] = useState<any[]>([]);
  const [participantMap, setParticipantMap] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [topScore, setTopScore] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [totalCheatAlert, setTotalCheatAlert] = useState(0);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [examConfig, setExamConfig] = useState<any>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Review Modal state
  const [showReview, setShowReview] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [essayGrades, setEssayGrades] = useState<Record<string, number>>({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'wrong_and_essay' | 'all' | 'wrong' | 'essay'>('wrong_and_essay');
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  const handleFilterChange = (filter: 'wrong_and_essay' | 'all' | 'wrong' | 'essay') => {
    setReviewFilter(filter);
    setActiveReviewIndex(0);
  };

  const getQuestionPoints = (q: any) => {
    if (!selectedAttempt) return 0;
    const userAnswer = selectedAttempt.answers?.[q.id] || '';
    const qType = q.options?.type || 'pg';
    const correctKey = q.correct_answer || q.answer || '';
    
    if (qType === 'essay') {
      const grades = essayGrades || {};
      return Number(grades[q.id] !== undefined ? grades[q.id] : (selectedAttempt.answers?.essay_grades?.[q.id] || 0));
    }
    
    if (!userAnswer) {
      return examConfig?.empty_point || 0;
    }
    
    if (qType === 'isian') {
      const correctAnswers = String(correctKey).toUpperCase().split('|').map(x => x.trim());
      const studentAns = String(userAnswer).trim().toUpperCase();
      if (correctAnswers.includes(studentAns)) {
        return Number(q.options?.points?.correct ?? examConfig?.correct_point ?? 4);
      } else {
        const penalty = examConfig?.penalty_point || 0;
        return penalty <= 0 ? penalty : -penalty;
      }
    }
    
    // Multiple Choice (PG)
    if (q.options && typeof q.options === 'object' && q.options.points) {
      // Custom points per option
      const selectedLetters = userAnswer.split('');
      let pts = 0;
      selectedLetters.forEach((l: string) => {
        pts += Number(q.options.points[l] || 0);
      });
      return pts;
    } else {
      // Standard PG points
      const correct = String(correctKey).trim().toUpperCase();
      const user = String(userAnswer).trim().toUpperCase();
      if (user === correct) {
        return examConfig?.correct_point ?? 4;
      } else {
        const penalty = examConfig?.penalty_point || 0;
        return penalty <= 0 ? penalty : -penalty;
      }
    }
  };

  // Delete per-participant
  const [showDeleteParticipant, setShowDeleteParticipant] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const hasGradesChanged = () => {
    const originalGrades = selectedAttempt?.answers?.essay_grades || {};
    const originalKeys = Object.keys(originalGrades);
    const currentKeys = Object.keys(essayGrades);
    
    if (originalKeys.length !== currentKeys.length) return true;
    
    for (const key of currentKeys) {
      if (Number(essayGrades[key]) !== Number(originalGrades[key])) {
        return true;
      }
    }
    return false;
  };

  const resolveParticipantInfo = (userId: string | undefined | null) => {
    if (!userId) {
      return {
        full_name: "Peserta NCC",
        school_name: "Asal Sekolah Tidak Diketahui",
        email: "",
        nisn: "",
        province: "",
        city: "",
        category: "",
        competition_type: "",
        team_name: "",
        mentor_name: "",
        whatsapp: ""
      };
    }

    const raw = String(userId).trim();
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();
    const clean = upper.replace(/^NCC[-\s]*/i, '');
    const prefixed = `NCC-${clean}`;

    const found = participantMap[raw] || 
                  participantMap[upper] || 
                  participantMap[lower] || 
                  participantMap[clean] || 
                  participantMap[prefixed];

    return found || {
      full_name: "Peserta NCC",
      school_name: "Asal Sekolah Tidak Diketahui",
      email: "",
      nisn: "",
      province: "",
      city: "",
      category: "",
      competition_type: "",
      team_name: "",
      mentor_name: "",
      whatsapp: ""
    };
  };

  const fetchLeaderboardData = async () => {
    try {
      const { getLeaderboardDataServer } = await import('@/app/actions/auth');
      const { exam, questions, attempts: attemptsData, entries, profiles, error: sErr } = await getLeaderboardDataServer(examId);

      if (sErr) {
        console.error('Gagal mengambil data papan skor:', sErr);
      }

      const qList = questions || [];
      setAllQuestions(qList);
      if (exam) setExamConfig(exam);

      const pMap: Record<string, any> = {};

      const register = (key: string | number | undefined | null, info: any) => {
        if (!key) return;
        const s = String(key).trim();
        if (!s) return;
        const u = s.toUpperCase();
        const l = s.toLowerCase();
        const c = u.replace(/^NCC[-\s]*/i, '');
        pMap[s] = info;
        pMap[u] = info;
        pMap[l] = info;
        pMap[c] = info;
        pMap[`NCC-${c}`] = info;
      };

      (entries || []).forEach((entry: any) => {
        let customTicketCode = "";
        let notesObj: any = null;
        if (entry.notes) {
          try {
            notesObj = typeof entry.notes === 'string' ? JSON.parse(entry.notes) : entry.notes;
            if (notesObj?.custom_ticket_id) {
              customTicketCode = String(notesObj.custom_ticket_id).toUpperCase().trim();
            } else if (notesObj?.ticket_code) {
              customTicketCode = String(notesObj.ticket_code).toUpperCase().trim();
            } else if (notesObj?.ticket_id) {
              customTicketCode = String(notesObj.ticket_id).toUpperCase().trim();
            }
          } catch (e) {}
        }
        
        const generatedFromId = generateTicketCode(entry.id);
        const generatedFromUserId = entry.user_id ? generateTicketCode(entry.user_id) : "";

        const fullName = entry.full_name || entry.name || entry.nama || entry.student_name || entry.nama_lengkap || notesObj?.full_name || notesObj?.name || "Peserta NCC";
        const schoolName = entry.school_name || entry.school || entry.asal_sekolah || notesObj?.school_name || notesObj?.school || "-";
        const branch = entry.competition_type || entry.category || entry.branch || notesObj?.competition_type || "";

        const participantInfo = {
          full_name: fullName,
          school_name: schoolName,
          school_origin: schoolName,
          email: entry.email || notesObj?.email || "",
          nisn: entry.nisn || notesObj?.nisn || "",
          province: entry.province || notesObj?.province || "",
          city: entry.city || notesObj?.city || "",
          category: entry.category || "",
          competition_type: branch,
          team_name: entry.team_name || notesObj?.team_name || "",
          mentor_name: entry.mentor_name || notesObj?.mentor_name || "",
          whatsapp: entry.whatsapp_number || entry.phone || notesObj?.phone || "",
        };

        register(entry.id, participantInfo);
        register(generatedFromId, participantInfo);
        register(`NCC-${generatedFromId}`, participantInfo);

        if (entry.user_id) {
          register(entry.user_id, participantInfo);
          register(generatedFromUserId, participantInfo);
          register(`NCC-${generatedFromUserId}`, participantInfo);
        }

        if (customTicketCode) {
          register(customTicketCode, participantInfo);
        }

        if (entry.nisn) register(entry.nisn, participantInfo);
        if (entry.email) register(entry.email, participantInfo);
      });

      (profiles || []).forEach((prof: any) => {
        const profName = prof.full_name || prof.name || "Peserta NCC";
        const profSchool = prof.school_name || prof.school || "-";
        const profInfo = {
          full_name: profName,
          school_name: profSchool,
          school_origin: profSchool,
          email: prof.email || "",
          nisn: prof.nisn || "",
          province: prof.province || "",
          city: prof.city || "",
          category: "",
          competition_type: "",
          team_name: "",
          mentor_name: "",
          whatsapp: prof.phone || prof.whatsapp_number || ""
        };

        register(prof.id, profInfo);
        register(generateTicketCode(prof.id), profInfo);
        if (prof.email) register(prof.email, profInfo);
      });

      setParticipantMap(pMap);

      if (attemptsData) {
        prosesDanUrutkanData(attemptsData, qList);
      }
    } catch (err: any) {
      console.error("Gagal load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkHasUngradedEssay = (item: any, customQuestions?: any[]) => {
    if (!item.answers) return false;
    const questionsToUse = customQuestions || allQuestions;
    const essayQuestions = questionsToUse.filter(q => (q.options?.type || 'pg') === 'essay');
    if (essayQuestions.length === 0) return false;
    return essayQuestions.some(q => {
      const userAnswer = item.answers[q.id];
      const grade = item.answers.essay_grades?.[q.id];
      return userAnswer && String(userAnswer).trim() !== "" && grade === undefined;
    });
  };

  const getFilteredQuestions = () => {
    if (!selectedAttempt) return [];
    return reviewQuestions.filter(q => {
      const userAnswer = selectedAttempt.answers?.[q.id];
      const correctKey = q.correct_answer || q.answer || '';
      const qType = q.options?.type || 'pg';
      const isEmpty = !userAnswer;

      let isCorrect = false;
      if (qType === 'isian') {
        const correctAnswers = String(correctKey).toUpperCase().split('|').map(x => x.trim());
        isCorrect = !!userAnswer && correctAnswers.includes(String(userAnswer).trim().toUpperCase());
      } else if (qType === 'essay') {
        isCorrect = false;
      } else {
        isCorrect = !!userAnswer && String(userAnswer).trim().toUpperCase() === String(correctKey).trim().toUpperCase();
      }

      if (reviewFilter === 'all') return true;
      if (reviewFilter === 'wrong_and_essay') {
        return qType === 'essay' || !isCorrect;
      }
      if (reviewFilter === 'wrong') {
        return !isCorrect && qType !== 'essay';
      }
      if (reviewFilter === 'essay') {
        return qType === 'essay';
      }
      return true;
    });
  };

  const prosesDanUrutkanData = (dataRaw: any[], customQuestions?: any[]) => {
    const dataUrut = [...dataRaw].sort((a, b) => {
      const sA = a.score ?? 0;
      const sB = b.score ?? 0;
      if (sB !== sA) return sB - sA;
      if (a.violations_count !== b.violations_count) return (a.violations_count || 0) - (b.violations_count || 0);
      const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
    });

    setAttempts(dataUrut);

    if (dataUrut.length > 0) {
      // Hanya hitung statistik skor dari peserta yang TIDAK memiliki esai tertunda (sudah dinilai)
      const completedAttempts = dataUrut.filter(p => !checkHasUngradedEssay(p, customQuestions));
      if (completedAttempts.length > 0) {
        const skorList = completedAttempts.map(p => p.score ?? 0);
        setTopScore(Math.max(...skorList));
        setAvgScore(Math.round(skorList.reduce((a, b) => a + b, 0) / skorList.length));
      } else {
        setTopScore(0);
        setAvgScore(0);
      }
      setTotalCheatAlert(dataUrut.reduce((acc, curr) => acc + (curr.violations_count || 0), 0));
    }
  };

  // Buka modal review: ambil soal dari DB lalu tampilkan
  const openReview = async (attempt: any) => {
    setSelectedAttempt(attempt);
    setShowReview(true);
    setReviewLoading(true);
    setReviewFilter('wrong_and_essay');
    setEssayGrades(attempt.answers?.essay_grades || {});

    const { data: qData } = await supabase
      .from('cbt_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true });

    if (qData) setReviewQuestions(qData);
    setActiveReviewIndex(0);
    setReviewLoading(false);
  };

  const handleSaveEssayGrades = async () => {
    if (!selectedAttempt) return;
    setIsSavingGrades(true);
    try {
      const res = await fetch('/api/admin/llms/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attempt_id: selectedAttempt.id,
          essay_grades: essayGrades
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menghitung ulang skor.");
      }

      await fetchLeaderboardData();
      showToast(`Berhasil melakukan approval! Skor peserta diperbarui menjadi: ${data.score} poin.`, 'success');
      setShowReview(false);
    } catch (err: any) {
      showToast("Gagal menyimpan nilai: " + err.message, 'error');
    } finally {
      setIsSavingGrades(false);
    }
  };

  const handleDeleteParticipant = async () => {
    if (!deleteTargetUser) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('cbt_attempts')
        .delete()
        .eq('user_id', deleteTargetUser)
        .eq('exam_id', examId);
      if (error) throw error;
      
      setShowDeleteParticipant(false);
      setDeleteTargetUser(null);
      fetchLeaderboardData();
      showToast("Data peserta berhasil dimusnahkan dari sesi ini!", 'success');
    } catch (err: any) {
      showToast("Gagal menghapus data: " + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!examId) return;
    fetchLeaderboardData();

    // 📡 DENGAR SKOR REAL-TIME (Optimasi Bebas Lag & Tanpa Loop Query)
    const channel = supabase
      .channel(`live-cbt-scores-${examId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cbt_attempts' }, (payload) => {
        // Cek DELETE dulu sebelum cek payload.new (DELETE selalu punya payload.new = {})
        if (payload.eventType === 'DELETE' && payload.old) {
          setAttempts((prev) => {
            // Filter by primary key saja — hapus baris yang didelete
            const nextList = prev.filter(p => p.id !== payload.old.id);
            if (nextList.length > 0) {
              const completedAttempts = nextList.filter(p => !checkHasUngradedEssay(p));
              if (completedAttempts.length > 0) {
                const skorList = completedAttempts.map(p => p.score ?? 0);
                setTopScore(Math.max(...skorList));
                setAvgScore(Math.round(skorList.reduce((a, b) => a + b, 0) / completedAttempts.length));
              } else {
                setTopScore(0);
                setAvgScore(0);
              }
              setTotalCheatAlert(nextList.reduce((acc, curr) => acc + (curr.violations_count || 0), 0));
            } else {
              setTopScore(0);
              setAvgScore(0);
              setTotalCheatAlert(0);
            }
            return nextList;
          });
        } else if (payload.new && (payload.new as any).exam_id === examId) {
          setAttempts((prev) => {
            let nextList = [...prev];
            const updated = payload.new as any;

            const idx = nextList.findIndex(p => p.user_id === updated.user_id);
            if (idx !== -1) {
              nextList[idx] = updated;
            } else {
              nextList.push(updated);
            }

            // Urutkan ulang data (Score DESC, Violations ASC, updated_at ASC)
            nextList.sort((a, b) => {
              const sA = a.score ?? 0;
              const sB = b.score ?? 0;
              if (sB !== sA) return sB - sA;
              if (a.violations_count !== b.violations_count) return (a.violations_count || 0) - (b.violations_count || 0);
              const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
            });

            // Perbarui statistik secara lokal (tanpa kueri jaringan)
            if (nextList.length > 0) {
              const completedAttempts = nextList.filter(p => !checkHasUngradedEssay(p));
              if (completedAttempts.length > 0) {
                const skorList = completedAttempts.map(p => p.score ?? 0);
                setTopScore(Math.max(...skorList));
                setAvgScore(Math.round(skorList.reduce((a, b) => a + b, 0) / completedAttempts.length));
              } else {
                setTopScore(0);
                setAvgScore(0);
              }
              setTotalCheatAlert(nextList.reduce((acc, curr) => acc + (curr.violations_count || 0), 0));
            }

            return nextList;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [examId]);

  const filteredAttempts = attempts.filter((item) => {
    const uid = item.user_id ? String(item.user_id).toLowerCase() : '';
    const info = resolveParticipantInfo(item.user_id);
    const query = searchQuery.toLowerCase();
    return uid.includes(query) || 
           String(info.full_name || '').toLowerCase().includes(query) || 
           String(info.school_name || '').toLowerCase().includes(query);
  });

  const downloadCSV = () => {
    downloadDetailCSV();
  };

  // Export detail: per question answer correctness
  const downloadDetailCSV = async (format: 'horizontal' | 'vertical' = 'vertical') => {
    if (attempts.length === 0) return;
    setIsExporting(true);
    try {
      const questions = allQuestions.length > 0 ? allQuestions : [];
      if (questions.length === 0) {
        const { data } = await supabase.from('cbt_questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true });
        if (data) questions.push(...data);
      }

      let csvContent = "";

      if (format === 'vertical') {
        // Build header for vertical format
        const headers = [
          '"Peringkat"', '"ID Peserta"', '"Nama Peserta"', '"Asal Sekolah"', 
          '"Nomor Soal"', '"Pertanyaan"', '"Jawaban Peserta"', '"Status Jawaban"', '"Skor Soal"',
          '"Skor Total"', '"Pelanggaran"', '"Status Ujian"', '"Terakhir Update"'
        ];

        const rows: string[] = [];

        filteredAttempts.forEach((item) => {
          const realRank = attempts.findIndex(a => a.id === item.id) + 1;
          const info = resolveParticipantInfo(item.user_id);

          questions.forEach((q, index) => {
            const userAns = item.answers?.[q.id];
            const correctKey = q.correct_answer || q.answer || '';
            const qType = q.options?.type || 'pg';

            // 1. Pertanyaan
            const cleanQText = `"${String(q.question_text || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

            // Prepare list of options to output as rows for this question
            const answersToOutput: string[] = [];

            if (!userAns) {
              answersToOutput.push('"(kosong)"');
            } else if (qType === 'essay' || qType === 'isian') {
              answersToOutput.push(`"${String(userAns).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`);
            } else {
              // Pilihan Ganda (PG) - Split into multiple rows if they selected multiple letters
              const selectedLetters = String(userAns).split('');
              if (selectedLetters.length === 0) {
                answersToOutput.push('"(kosong)"');
              } else {
                selectedLetters.forEach(letter => {
                  const upperL = letter.toUpperCase();
                  const optionText = q.options?.[upperL] || q.options?.[letter.toLowerCase()] || '';
                  const displayAns = optionText ? `${upperL} (${optionText})` : upperL;
                  answersToOutput.push(`"${displayAns.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`);
                });
              }
            }

            // Loop through each split answer and output a row in the CSV
            answersToOutput.forEach((cleanUserAns, subIndex) => {
              // Calculate status and points for each row
              let statusText = '';
              let pointEarned = 0;

              if (!userAns) {
                statusText = 'KOSONG';
                pointEarned = examConfig?.empty_point || 0;
              } else if (qType === 'essay') {
                const essayScore = item.answers?.essay_grades?.[q.id];
                if (essayScore === undefined) {
                  statusText = 'BELUM DINILAI';
                  pointEarned = 0;
                } else {
                  statusText = 'ESSAY';
                  pointEarned = Number(essayScore);
                }
              } else if (qType === 'isian') {
                const correctAnswers = String(correctKey).toUpperCase().split('|').map((x) => x.trim());
                const isCorrect = correctAnswers.includes(String(userAns).trim().toUpperCase());
                if (isCorrect) {
                  statusText = 'BENAR';
                  pointEarned = Number(q.options?.points?.correct ?? examConfig?.correct_point ?? 4);
                } else {
                  statusText = 'SALAH';
                  const penalty = examConfig?.penalty_point || 0;
                  pointEarned = penalty <= 0 ? penalty : -penalty;
                }
              } else {
                // PG
                if (q.options && typeof q.options === 'object' && q.options.points) {
                  const selectedLetters = String(userAns).split('');
                  let pts = 0;
                  selectedLetters.forEach((l) => {
                    pts += Number(q.options.points[l] || 0);
                  });
                  pointEarned = pts;
                  if (pts > 0) {
                    statusText = 'BENAR';
                  } else {
                    statusText = 'SALAH';
                  }
                } else {
                  const isCorrect = String(userAns).trim().toUpperCase() === String(correctKey).trim().toUpperCase();
                  if (isCorrect) {
                    statusText = 'BENAR';
                    pointEarned = examConfig?.correct_point ?? 4;
                  } else {
                    statusText = 'SALAH';
                    const penalty = examConfig?.penalty_point || 0;
                    pointEarned = penalty <= 0 ? penalty : -penalty;
                  }
                }
              }

              const row = [
                realRank,
                `"${item.user_id}"`,
                `"${(info.full_name || '').replace(/"/g, '""')}"`,
                `"${(info.school_name || '').replace(/"/g, '""')}"`,
                `"Soal ${index + 1}${answersToOutput.length > 1 ? ` - Pilihan ${subIndex + 1}` : ''}"`,
                cleanQText,
                cleanUserAns,
                `"${statusText}"`,
                pointEarned,
                checkHasUngradedEssay(item, questions) ? '"Ditinjau"' : (item.score ?? 0),
                item.violations_count || 0,
                `"${item.submitted_at ? 'SELESAI' : 'BERLANGSUNG'}"`,
                `"${new Date(item.updated_at).toLocaleString('id-ID')}"`
              ];

              rows.push(row.join(','));
            });
          });
        });

        csvContent = "\uFEFF" + headers.join(',') + "\n" + rows.join("\n");
      } else {
        // Build header dynamically: basic info + per-question details (grouped for readability)
        const headers = [
          '"Peringkat"', '"ID Peserta"', '"Nama Peserta"', '"Asal Sekolah"', '"Skor Total"', '"Jumlah Benar"', '"Jumlah Salah"', '"Jumlah Kosong"',
          '"Pelanggaran"', '"Status Submit"', '"Terakhir Update"'
        ];
        questions.forEach((q, i) => {
          headers.push(`"Soal ${i + 1}: Pertanyaan"`);
          headers.push(`"Soal ${i + 1}: Jawaban Peserta"`);
          headers.push(`"Soal ${i + 1}: Status"`);
          headers.push(`"Soal ${i + 1}: Skor"`);
        });

        const rows = filteredAttempts.map((item) => {
          // Gunakan rank asli dari full attempts list
          const realRank = attempts.findIndex(a => a.id === item.id) + 1;
          let benar = 0, salah = 0, kosong = 0;
          const qCols: string[] = [];

          questions.forEach((q) => {
            const userAns = item.answers?.[q.id];
            const correctKey = q.correct_answer || q.answer || '';
            const qType = q.options?.type || 'pg';

            // 1. Pertanyaan
            const cleanQText = `"${String(q.question_text || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

            // 4. Jawaban Peserta (Spill Pilihan Ganda if qType is pg/standard MC)
            let cleanUserAns = '"(kosong)"';
            if (userAns) {
              if (qType === 'essay' || qType === 'isian') {
                cleanUserAns = `"${String(userAns).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
              } else {
                // Pilihan Ganda (PG) - Spill the answer option text
                const selectedLetters = String(userAns).split('');
                const spilledOptions = selectedLetters.map(letter => {
                  const upperL = letter.toUpperCase();
                  const optionText = q.options?.[upperL] || q.options?.[letter.toLowerCase()] || '';
                  return optionText ? `${upperL} (${optionText})` : upperL;
                });
                const combinedText = spilledOptions.join(' | ');
                cleanUserAns = `"${combinedText.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
              }
            }

            // 5. Status & 6. Poin
            let statusText = '';
            let pointEarned = 0;

            if (!userAns) {
              kosong++;
              statusText = 'KOSONG';
              pointEarned = examConfig?.empty_point || 0;
            } else if (qType === 'essay') {
              const essayScore = item.answers?.essay_grades?.[q.id];
              if (essayScore === undefined) {
                statusText = 'BELUM DINILAI';
                pointEarned = 0;
              } else {
                statusText = 'ESSAY';
                pointEarned = Number(essayScore);
                if (pointEarned > 0) benar++; else salah++;
              }
            } else if (qType === 'isian') {
              const correctAnswers = String(correctKey).toUpperCase().split('|').map((x) => x.trim());
              const isCorrect = correctAnswers.includes(String(userAns).trim().toUpperCase());
              if (isCorrect) {
                benar++;
                statusText = 'BENAR';
                pointEarned = Number(q.options?.points?.correct ?? examConfig?.correct_point ?? 4);
              } else {
                salah++;
                statusText = 'SALAH';
                const penalty = examConfig?.penalty_point || 0;
                pointEarned = penalty <= 0 ? penalty : -penalty;
              }
            } else {
              // PG
              if (q.options && typeof q.options === 'object' && q.options.points) {
                const selectedLetters = String(userAns).split('');
                let pts = 0;
                selectedLetters.forEach((l) => {
                  pts += Number(q.options.points[l] || 0);
                });
                pointEarned = pts;
                if (pts > 0) {
                  benar++;
                  statusText = 'BENAR';
                } else {
                  salah++;
                  statusText = 'SALAH';
                }
              } else {
                const isCorrect = String(userAns).trim().toUpperCase() === String(correctKey).trim().toUpperCase();
                if (isCorrect) {
                  benar++;
                  statusText = 'BENAR';
                  pointEarned = examConfig?.correct_point ?? 4;
                } else {
                  salah++;
                  statusText = 'SALAH';
                  const penalty = examConfig?.penalty_point || 0;
                  pointEarned = penalty <= 0 ? penalty : -penalty;
                }
              }
            }

            qCols.push(cleanQText);
            qCols.push(cleanUserAns);
            qCols.push(`"${statusText}"`);
            qCols.push(String(pointEarned));
          });

          const info = resolveParticipantInfo(item.user_id);

          const rowMeta = [
            realRank,
            `"${item.user_id}"`,
            `"${(info.full_name || '').replace(/"/g, '""')}"`,
            `"${(info.school_name || '').replace(/"/g, '""')}"`,
            checkHasUngradedEssay(item, questions) ? '"Ditinjau"' : (item.score ?? 0),
            benar,
            salah,
            kosong,
            item.violations_count || 0,
            `"${item.submitted_at ? 'SELESAI' : 'BERLANGSUNG'}"`,
            `"${new Date(item.updated_at).toLocaleString('id-ID')}"`
          ];

          return [...rowMeta, ...qCols].join(',');
        });

        csvContent = "\uFEFF" + headers.join(',') + "\n" + rows.join("\n");
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Detail_Jawaban_${format === 'vertical' ? 'Vertikal' : 'Horizontal'}_NCC13_${examId.split('-')[0]}_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast('Gagal mengekspor data: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const rankMedal = (i: number) => {
    if (i === 0) return 'bg-amber-400 text-white shadow-lg shadow-amber-200';
    if (i === 1) return 'bg-slate-400 text-white shadow-md shadow-slate-200';
    if (i === 2) return 'bg-orange-400 text-white shadow-md shadow-orange-200';
    return 'bg-gray-100 text-gray-500';
  };

  // Hitung statistik untuk review
  const getReviewStats = () => {
    if (!selectedAttempt || reviewQuestions.length === 0) return { correct: 0, wrong: 0, empty: 0, totalPoints: 0 };
    let correct = 0, wrong = 0, empty = 0;
    let totalPoints = 0;
    const fixedCorrect = examConfig?.correct_point ?? 4;
    const penaltyPt = examConfig?.penalty_point || 0;
    reviewQuestions.forEach(q => {
      const userAnswer = selectedAttempt.answers?.[q.id];
      const key = q.correct_answer || q.answer || '';
      const qType = q.options?.type || 'pg';
      if (!userAnswer || String(userAnswer).trim() === '') {
        empty++;
        totalPoints += examConfig?.empty_point || 0;
      } else if (qType === 'essay') {
        correct++;
        const gradeVal = Number(essayGrades[q.id] ?? selectedAttempt.answers?.essay_grades?.[q.id] ?? 0);
        totalPoints += gradeVal;
      } else if (qType === 'isian') {
        const correctAnswers = String(key).toUpperCase().split('|').map(x => x.trim());
        const isCorrect = correctAnswers.includes(String(userAnswer).trim().toUpperCase());
        if (isCorrect) {
          correct++;
          totalPoints += Number(q.options?.points?.correct ?? fixedCorrect);
        } else {
          wrong++;
          totalPoints += penaltyPt > 0 ? -penaltyPt : penaltyPt;
        }
      } else {
        // PG
        if (q.options?.points) {
          const pts = Number(q.options.points[String(userAnswer).toUpperCase()] ?? 0);
          totalPoints += pts;
          if (pts > 0) correct++;
          else wrong++;
        } else {
          const isCorrect = String(userAnswer).trim().toUpperCase() === String(key).trim().toUpperCase();
          if (isCorrect) {
            correct++;
            totalPoints += fixedCorrect;
          } else {
            wrong++;
            totalPoints += penaltyPt > 0 ? -penaltyPt : penaltyPt;
          }
        }
      }
    });
    return { correct, wrong, empty, totalPoints };
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] font-sans text-gray-800">

      {/* ===== MODAL HAPUS PESERTA ===== */}
      {showDeleteParticipant && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Hapus Data Peserta?</h2>
            <p className="text-sm text-gray-500 font-medium mt-2">ID: <span className="font-black text-gray-800">{deleteTargetUser}</span></p>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Semua data (jawaban, skor, submit) peserta ini akan <span className="font-black text-rose-600">dihapus permanen</span>.
              Peserta akan bisa ikut ujian kembali setelah ini.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowDeleteParticipant(false); setDeleteTargetUser(null); }} disabled={isDeleting} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Batal</button>
              <button onClick={handleDeleteParticipant} disabled={isDeleting} className="flex-1 py-3.5 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2">
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL FORMAT EKSPOR CSV ===== */}
      {showCsvModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-[#5145cd]" /> Format Ekspor CSV
              </h3>
              <button 
                onClick={() => setShowCsvModal(false)}
                className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="py-6 space-y-4">
              <button
                onClick={() => {
                  downloadDetailCSV('vertical');
                  setShowCsvModal(false);
                }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#5145cd] hover:bg-indigo-50/30 transition-all flex items-start gap-3"
              >
                <div className="mt-0.5 bg-indigo-100 text-[#5145cd] p-2 rounded-lg flex-shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Format Tabel Vertikal (Rekomendasi)</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Setiap jawaban peserta dijabarkan ke bawah (baris baru). Sangat rapi, tidak memanjang ke samping, dan mudah difilter/dianalisis di Excel.
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadDetailCSV('horizontal');
                  setShowCsvModal(false);
                }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#5145cd] hover:bg-indigo-50/30 transition-all flex items-start gap-3"
              >
                <div className="mt-0.5 bg-slate-100 text-slate-600 p-2 rounded-lg flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Format Tabel Horizontal</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Satu baris mewakili satu peserta, dengan kolom detail pertanyaan memanjang ke samping kanan.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL REVIEW MOODLE-STYLE ===== */}
      {showReview && selectedAttempt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-[#f4f7fe] rounded-[32px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            
            {/* Header Modal */}
            <div className="bg-white px-8 py-5 flex justify-between items-center border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#5145cd]" /> Detail Jawaban Peserta
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  ID: {selectedAttempt.user_id} · Skor: {selectedAttempt.score ?? 0} poin
                </p>
              </div>
              <button onClick={() => setShowReview(false)} className="w-10 h-10 bg-gray-100 hover:bg-rose-100 hover:text-rose-600 text-gray-500 rounded-full flex items-center justify-center transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Statistik ringkas */}
            {!reviewLoading && (() => {
              const stats = getReviewStats();
              return (
                <div className="grid grid-cols-4 gap-2.5 px-8 py-4 bg-white border-b border-gray-50 flex-shrink-0">
                  {/* Benar */}
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl border bg-emerald-50 border-emerald-100">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-2xl font-black leading-none text-emerald-600">{stats.correct}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Benar</p>
                    </div>
                  </div>
                  {/* Salah */}
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl border bg-rose-50 border-rose-100">
                    <XCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
                    <div>
                      <p className="text-2xl font-black leading-none text-rose-600">{stats.wrong}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Salah</p>
                    </div>
                  </div>
                  {/* Kosong */}
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl border bg-gray-50 border-gray-100">
                    <MinusCircle className="w-5 h-5 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-2xl font-black leading-none text-gray-500">{stats.empty}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Kosong</p>
                    </div>
                  </div>
                  {/* Total Poin */}
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl border bg-indigo-50 border-indigo-100">
                    <Star className="w-5 h-5 flex-shrink-0 text-indigo-500 fill-indigo-200" />
                    <div>
                      <p className="text-2xl font-black leading-none text-indigo-600">{stats.totalPoints}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mt-0.5">Total Poin</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Filter Soal */}
            {!reviewLoading && (
              <div className="px-8 py-3 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tampilan:</span>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'wrong_and_essay', label: 'Salah & Essai', icon: AlertTriangle },
                      { id: 'all', label: 'Semua Soal', icon: BookOpen },
                      { id: 'wrong', label: 'Hanya Salah', icon: XCircle },
                      { id: 'essay', label: 'Hanya Essai', icon: Info }
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => handleFilterChange(btn.id as any)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                          reviewFilter === btn.id
                            ? 'bg-[#5145cd] text-white border-[#5145cd] shadow-md shadow-indigo-100'
                            : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <btn.icon className="w-3.5 h-3.5" />
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl uppercase tracking-wider animate-pulse">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Default: Soal Salah & Essai
                </div>
              </div>
            )}

            {/* Layout Utama CBT-Style: 2 Kolom (Kiri: Soal, Kanan: Peta Soal/Navigasi) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[500px]">
              
              {/* Kolom Kiri: Kartu Soal & Jawaban */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {reviewLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#5145cd] mb-3" />
                    <p className="text-sm font-bold text-gray-400">Memuat soal...</p>
                  </div>
                ) : reviewQuestions.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <p className="text-sm font-bold">Soal tidak ditemukan.</p>
                  </div>
                ) : (
                  (() => {
                    const filtered = getFilteredQuestions();
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-20 bg-white rounded-[24px] border border-dashed border-gray-200">
                          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Tidak Ada Soal</p>
                          <p className="text-xs text-gray-400 mt-1 font-medium">Tidak ada soal yang cocok dengan filter yang dipilih.</p>
                        </div>
                      );
                    }

                    const safeIndex = activeReviewIndex >= filtered.length ? 0 : activeReviewIndex;
                    const q = filtered[safeIndex];
                    if (!q) return null;

                    const originalIdx = reviewQuestions.findIndex(rq => rq.id === q.id);
                    const userAnswer = selectedAttempt.answers?.[q.id];
                    const correctKey = q.correct_answer || q.answer || '';
                    const qType = q.options?.type || 'pg';
                    const isEmpty = !userAnswer;

                    let isCorrect = false;
                    if (qType === 'isian') {
                      const correctAnswers = String(correctKey).toUpperCase().split('|').map(x => x.trim());
                      isCorrect = !!userAnswer && correctAnswers.includes(String(userAnswer).trim().toUpperCase());
                    } else if (qType === 'essay') {
                      isCorrect = false;
                    } else {
                      if (q.options?.points) {
                        const pts = q.options.points[String(userAnswer).toUpperCase()] ?? 0;
                        isCorrect = pts > 0;
                      } else {
                        isCorrect = !!userAnswer && (
                          String(userAnswer).trim().toUpperCase() === String(correctKey).trim().toUpperCase() ||
                          (String(correctKey).length > 1 && String(correctKey).toUpperCase().includes(String(userAnswer).trim().toUpperCase()))
                        );
                      }
                    }

                    const borderColor = isEmpty 
                      ? 'border-gray-200' 
                      : qType === 'essay' 
                        ? 'border-amber-200' 
                        : isCorrect 
                          ? 'border-emerald-300' 
                          : 'border-rose-300';

                    const bgColor = isEmpty 
                      ? 'bg-white' 
                      : qType === 'essay' 
                        ? 'bg-amber-50/10' 
                        : isCorrect 
                          ? 'bg-emerald-50/30' 
                          : 'bg-rose-50/30';

                    return (
                      <div key={q.id} className={`rounded-[20px] border-2 p-5 ${borderColor} ${bgColor} bg-white transition-all duration-300`}>
                        {/* Soal header */}
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Soal No. {originalIdx + 1}</span>
                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-indigo-100">
                              {qType === 'pg' ? 'Pilihan Ganda' : qType === 'isian' ? 'Isian Singkat' : 'Essai Bebas'}
                            </span>
                          </div>
                           <div className="flex items-center gap-1.5">
                            {isEmpty ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full">
                                <MinusCircle className="w-3 h-3" /> TIDAK DIJAWAB
                              </span>
                            ) : qType === 'essay' ? (
                              essayGrades[q.id] === undefined ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full animate-pulse shadow-sm">
                                  <Info className="w-3.5 h-3.5" /> DALAM REVIEW
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> SUDAH DINILAI
                                </span>
                              )
                            ) : isCorrect ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> BENAR
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                                <XCircle className="w-3.5 h-3.5" /> SALAH
                              </span>
                            )}

                            {/* Point Badge */}
                            {examConfig && (examConfig.correct_point !== 0 || examConfig.scoring_system === 'Custom' || qType === 'essay') && (() => {
                              const pts = getQuestionPoints(q);
                              const ptsText = pts >= 0 ? `+${pts} Poin` : `${pts} Poin`;
                              return (
                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                                  pts > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  pts < 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                }`}>
                                  {ptsText}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Teks soal */}
                        <p className="text-sm font-medium text-gray-800 mb-4 leading-relaxed whitespace-pre-wrap">
                          {q.question_text}
                        </p>

                        {/* Perbandingan jawaban */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                          <div className={`p-4 rounded-2xl border ${
                            isEmpty ? 'bg-gray-50 border-gray-200' :
                            qType === 'essay' ? 'bg-amber-50/30 border-amber-200' :
                            isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                          }`}>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Jawaban Peserta</p>
                            {isEmpty ? (
                              <p className="text-sm font-bold text-gray-400 italic">— Tidak menjawab —</p>
                            ) : qType === 'pg' ? (
                              <div className="space-y-1.5 mt-2">
                                {(() => {
                                  const letters = userAnswer.split('');
                                  return letters.map((l: string) => {
                                    const text = q.options?.[l] || q.options?.[l.toLowerCase()] || '';
                                    return (
                                      <div key={l} className={`flex items-center gap-2.5 px-3 py-2 border rounded-xl ${
                                        isCorrect 
                                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' 
                                          : 'bg-rose-50/50 border-rose-200 text-rose-800'
                                      } text-xs font-black transition-all`}>
                                        <span className={`w-6 h-6 ${isCorrect ? 'bg-emerald-200 text-emerald-900 border-emerald-300' : 'bg-rose-200 text-rose-900 border-rose-300'} text-[10px] font-black rounded-full flex items-center justify-center border uppercase flex-shrink-0`}>{l}</span>
                                        <span>{text}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            ) : (
                              <p className={`text-sm font-bold whitespace-pre-wrap leading-relaxed ${qType === 'essay' ? 'text-amber-900' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {userAnswer}
                              </p>
                            )}
                          </div>

                          <div className="p-4 rounded-2xl border bg-indigo-50 border-indigo-200">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Kunci / Panduan Jawaban</p>
                            {qType === 'pg' ? (
                              <div className="space-y-1.5 mt-2">
                                {(() => {
                                  const letters = correctKey.split('');
                                  return letters.map((l: string) => {
                                    const text = q.options?.[l] || q.options?.[l.toLowerCase()] || '';
                                    
                                    // Hitung poin yang diset admin untuk opsi ini
                                    let pts = 0;
                                    if (q.options?.points) {
                                      pts = Number(q.options.points[l] || 0);
                                    } else {
                                      pts = examConfig?.correct_point ?? 4;
                                    }
                                    const ptsText = pts >= 0 ? `+${pts} Poin` : `${pts} Poin`;

                                    return (
                                      <div key={l} className="flex justify-between items-center gap-2.5 px-3 py-2 border border-indigo-100 bg-indigo-100/40 text-indigo-800 text-xs font-black transition-all rounded-xl">
                                        <div className="flex items-center gap-2.5">
                                          <span className="w-6 h-6 bg-indigo-200 text-indigo-900 border border-indigo-300 text-[10px] font-black rounded-full flex items-center justify-center uppercase flex-shrink-0">{l}</span>
                                          <span>{text}</span>
                                        </div>
                                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-200 font-black">
                                          {ptsText}
                                        </span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-bold text-indigo-700 whitespace-pre-wrap leading-relaxed">
                                    {correctKey}
                                </p>
                                {(() => {
                                  const pts = Number(q.options?.points?.correct ?? examConfig?.correct_point ?? 4);
                                  const ptsText = pts >= 0 ? `+${pts} Poin` : `${pts} Poin`;
                                  return (
                                    <div className="mt-2.5">
                                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-200 font-black">
                                        Kunci Benar ({ptsText})
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {qType === 'pg' && q.options && (
                          <div className="mt-4 p-4 rounded-2xl border border-gray-200 bg-gray-50/30 text-left">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <ClipboardList className="w-3.5 h-3.5 text-gray-400" /> Pilihan Ganda Ujian:
                            </p>
                            <div className="space-y-1.5">
                              {Object.entries(q.options)
                                .filter(([key]) => ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e'].includes(key))
                                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                                .map(([key, val]) => {
                                  const isUserSelected = String(userAnswer).toUpperCase() === key.toUpperCase();
                                  let isOptCorrect = false;
                                  let pointVal = 0;
                                  if (q.options?.points) {
                                    pointVal = Number(q.options.points[key] || 0);
                                    isOptCorrect = pointVal > 0;
                                  } else {
                                    isOptCorrect = String(correctKey).toUpperCase().includes(key.toUpperCase());
                                  }
                                  
                                  let optBg = 'bg-white border-gray-200 text-gray-700';
                                  let badge = null;
                                  
                                  const displayPts = q.options?.points ? pointVal : (examConfig?.correct_point ?? 4);
                                  const penaltyVal = examConfig?.penalty_point || 0;
                                  const penaltyText = penaltyVal > 0 ? `-${penaltyVal} Poin` : '';

                                  if (isUserSelected && isOptCorrect) {
                                    optBg = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold';
                                    badge = (
                                      <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                                        Jawaban Peserta (Benar +{displayPts} Poin)
                                      </span>
                                    );
                                  } else if (isUserSelected) {
                                    optBg = 'bg-rose-50 border-rose-300 text-rose-800 font-extrabold';
                                    badge = (
                                      <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200">
                                        Jawaban Peserta (Salah {penaltyText ? ` ${penaltyText}` : ''})
                                      </span>
                                    );
                                  } else if (isOptCorrect) {
                                    optBg = 'bg-indigo-50 border-indigo-300 text-indigo-800 font-extrabold';
                                    badge = (
                                      <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200">
                                        Kunci Jawaban (+{displayPts} Poin)
                                      </span>
                                    );
                                  }

                                  return (
                                    <div key={key} className={`flex justify-between items-center px-4 py-2.5 border rounded-xl text-xs transition-all ${optBg}`}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-black uppercase">{key}.</span>
                                        <span>{String(val)}</span>
                                      </div>
                                      {badge}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {qType === 'essay' && !isEmpty && (
                          <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 text-left">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Penilaian Juri & Approval
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-500 font-bold">
                                  Berikan poin untuk jawaban ini
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mt-0.5">
                                  <Pin className="w-3 h-3 text-gray-400" /> Referensi bobot soal: <span className="font-black text-indigo-600">{q.weight || 0}</span> poin · Admin bebas menentukan nilai
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={q.weight || 10}
                                  step="0.5"
                                  value={essayGrades[q.id] !== undefined ? essayGrades[q.id] : ""}
                                  onChange={(e) => {
                                    const valStr = e.target.value;
                                    const maxVal = q.weight || 10;
                                    setEssayGrades(prev => {
                                      const next = { ...prev };
                                      if (valStr === "") {
                                        delete next[q.id];
                                      } else {
                                        next[q.id] = Math.min(maxVal, Math.max(0, Number(valStr) || 0));
                                      }
                                      return next;
                                    });
                                  }}
                                  className="w-32 px-3 py-2 bg-white border-2 border-amber-300 rounded-xl font-black text-center text-[#5145cd] focus:border-[#5145cd] focus:ring-2 focus:ring-[#5145cd]/20 text-sm shadow-sm transition-all"
                                  placeholder="Belum dinilai"
                                />
                                <span className="text-xs font-bold text-gray-400">Poin</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Kolom Kanan: Peta Soal / Navigasi Grid Angka */}
              {!reviewLoading && (() => {
                const filtered = getFilteredQuestions();
                if (filtered.length === 0) return null;
                return (
                  <div className="w-full lg:w-64 bg-slate-50 border-l border-gray-100 p-5 overflow-y-auto flex flex-col flex-shrink-0">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-gray-500" /> Peta Soal Peserta
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {filtered.map((qItem, i) => {
                        const qType = qItem.options?.type || 'pg';
                        const userAnswer = selectedAttempt.answers?.[qItem.id];
                        const correctKey = qItem.correct_answer || qItem.answer || '';
                        const isEmpty = !userAnswer;

                        let isCorrect = false;
                        if (qType === 'isian') {
                          const correctAnswers = String(correctKey).toUpperCase().split('|').map(x => x.trim());
                          isCorrect = !!userAnswer && correctAnswers.includes(String(userAnswer).trim().toUpperCase());
                        } else if (qType === 'essay') {
                          isCorrect = false;
                        } else {
                          if (qItem.options?.points) {
                            const pts = qItem.options.points[String(userAnswer).toUpperCase()] ?? 0;
                            isCorrect = pts > 0;
                          } else {
                            isCorrect = !!userAnswer && (
                              String(userAnswer).trim().toUpperCase() === String(correctKey).trim().toUpperCase() ||
                              (String(correctKey).length > 1 && String(correctKey).toUpperCase().includes(String(userAnswer).trim().toUpperCase()))
                            );
                          }
                        }

                        // Style mapping:
                        // - Active: Border ring-2 ring-indigo-600
                        // - Essay Belum Dinilai: Amber
                        // - Benar: Green
                        // - Salah: Red
                        // - Kosong: Gray
                        const isCurrent = i === activeReviewIndex;
                        const isEssayUnresolved = qType === 'essay' && userAnswer && selectedAttempt.answers?.essay_grades?.[qItem.id] === undefined;

                        let btnStyle = "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200";
                        if (isEssayUnresolved) {
                          btnStyle = "bg-amber-500 text-white border-amber-600 shadow-sm";
                        } else if (qType === 'essay') {
                          btnStyle = "bg-sky-500 text-white border-sky-600 shadow-sm"; // Essay sudah dinilai
                        } else if (isEmpty) {
                          btnStyle = "bg-gray-200 text-gray-400 border-gray-300 shadow-sm";
                        } else if (isCorrect) {
                          btnStyle = "bg-emerald-500 text-white border-emerald-600 shadow-sm";
                        } else {
                          btnStyle = "bg-rose-500 text-white border-rose-600 shadow-sm";
                        }

                        if (isCurrent) {
                          btnStyle += " scale-110 ring-2 ring-offset-2 ring-indigo-600 z-10 font-black";
                        }

                        return (
                          <button
                            key={qItem.id}
                            onClick={() => setActiveReviewIndex(i)}
                            className={`w-full aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all border-2 ${btnStyle}`}
                            title={`Soal ${i + 1} (${qType.toUpperCase()})`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legenda Warna */}
                    <div className="mt-8 pt-4 border-t border-gray-200 space-y-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <p className="text-[9px] font-black text-gray-400 mb-1">Legenda Warna:</p>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-emerald-500 rounded border border-emerald-600 shrink-0"></span>
                        <span>Benar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-rose-500 rounded border border-rose-600 shrink-0"></span>
                        <span>Salah</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-amber-500 rounded border border-amber-600 shrink-0"></span>
                        <span>Essay Review</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-sky-500 rounded border border-sky-600 shrink-0"></span>
                        <span>Essay Dinilai</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 bg-gray-200 rounded border border-gray-300 shrink-0"></span>
                        <span>Kosong</span>
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>            {/* Footer Modal */}
            <div className="bg-white px-8 py-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
              {/* Prev / Next Slider Navigation Controls */}
              {!reviewLoading && (() => {
                const filtered = getFilteredQuestions();
                if (filtered.length === 0) return <div></div>;
                const safeIndex = activeReviewIndex >= filtered.length ? 0 : activeReviewIndex;
                return (
                  <div className="flex items-center gap-2 shadow-inner bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
                    <button
                      disabled={safeIndex === 0}
                      onClick={() => setActiveReviewIndex(prev => Math.max(0, prev - 1))}
                      className="px-3.5 py-1.5 bg-white border border-gray-200 text-[#5145cd] hover:bg-indigo-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed text-xs font-black rounded-xl transition-all flex items-center gap-1"
                    >
                      ← Prev
                    </button>
                    <span className="text-[10px] font-black text-slate-500 min-w-[90px] text-center">
                      Soal {safeIndex + 1} dari {filtered.length}
                    </span>
                    <button
                      disabled={safeIndex === filtered.length - 1}
                      onClick={() => setActiveReviewIndex(prev => Math.min(filtered.length - 1, prev + 1))}
                      className="px-3.5 py-1.5 bg-white border border-gray-200 text-[#5145cd] hover:bg-indigo-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed text-xs font-black rounded-xl transition-all flex items-center gap-1"
                    >
                      Next →
                    </button>
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                <button
                  onClick={() => setShowReview(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={handleSaveEssayGrades}
                  disabled={isSavingGrades || !hasGradesChanged()}
                  className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${
                    (isSavingGrades || !hasGradesChanged())
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-[#5145cd] hover:bg-[#3d32a8] text-white shadow-lg shadow-indigo-100 shadow-indigo-100/30'
                  }`}
                >
                  {isSavingGrades ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingGrades ? 'Menyimpan...' : 'Simpan & Akumulasi Skor'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STICKY TOP BAR */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/hq/llms" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:text-[#5145cd] transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Live Scoring & Peringkat
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">NCC 13th · Auto-update real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchLeaderboardData} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:text-[#5145cd] transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={downloadCSV} className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-50 shadow-sm transition-all">
              <Download className="w-4 h-4 mr-2 text-indigo-500" /> Rekap Skor
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              disabled={isExporting}
              className="flex items-center px-4 py-2.5 bg-[#5145cd] hover:bg-[#3d32a8] border border-transparent text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-60"
            >
              {isExporting
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Download className="w-4 h-4 mr-2" />
              }
              {isExporting ? 'Mengekspor...' : 'Detail Jawaban'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">

        {/* STATS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { label: 'Skor Tertinggi', value: topScore, icon: Trophy, color: 'amber' },
            { label: 'Rata-Rata Skor', value: avgScore, icon: Users, color: 'indigo' },
            { label: 'Total Pelanggaran', value: totalCheatAlert, icon: ShieldAlert, color: 'rose', alert: true },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className={`text-4xl font-black mt-1 ${(s as any).alert && s.value > 0 ? 'text-rose-600' : 'text-gray-900'}`}>{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                s.color === 'amber' ? 'bg-amber-50 text-amber-500' :
                s.color === 'indigo' ? 'bg-indigo-50 text-[#5145cd]' :
                (s as any).alert && s.value > 0 ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200' : 'bg-rose-50 text-rose-400'
              }`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-10" />
            <input
              type="text"
              placeholder="Cari berdasarkan ID, nama, atau asal sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm text-gray-700 focus:ring-2 focus:ring-[#5145cd]/20 focus:border-[#5145cd] transition-all shadow-sm"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                <p className="text-sm text-gray-400">Menghubungkan ke saluran real-time...</p>
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="p-20 text-center text-sm text-gray-400">
                Belum ada peserta yang submit.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="py-4 px-6 text-center w-20">Rank</th>
                    <th className="py-4 px-6">ID Peserta</th>
                    <th className="py-4 px-6 text-center">Skor</th>
                    <th className="py-4 px-6 text-center">Pelanggaran</th>
                    <th className="py-4 px-6 text-right">Update</th>
                    <th className="py-4 px-6 text-center">Review</th>
                    <th className="py-4 px-6 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAttempts.map((item, index) => {
                    const score = item.score ?? 0;
                    const hasViolations = item.violations_count > 0;
                    const isDone = !!item.submitted_at;
                    const hasAnswers = item.answers && Object.keys(item.answers).length > 0;

                    return (
                      <tr key={item.id || item.user_id}
                        className={`hover:bg-gray-50/50 transition-colors ${hasViolations ? 'bg-rose-50/20' : ''}`}
                      >
                        {/* RANK */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black ${rankMedal(index)}`}>
                            {index + 1}
                          </span>
                        </td>

                        {/* ID & BIODATA PESERTA */}
                        <td className="py-4 px-6">
                          {(() => {
                            const info = resolveParticipantInfo(item.user_id);
                            return (
                              <div className="flex flex-col gap-1 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-800 text-sm hover:text-[#5145cd] transition-colors">
                                    {info.full_name || "Peserta Anonim"}
                                  </span>
                                  {isDone && (
                                    checkHasUngradedEssay(item) ? (
                                      <span className="bg-amber-100 text-amber-700 font-black text-[8px] px-2 py-0.5 rounded uppercase tracking-wider animate-pulse border border-amber-200">Dalam Review</span>
                                    ) : (
                                      <span className="bg-emerald-100 text-emerald-700 font-black text-[8px] px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-250/30">Selesai</span>
                                    )
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                  <span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] text-slate-650 font-black">
                                    {item.user_id}
                                  </span>
                                  {info.school_name && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-slate-500 font-semibold truncate max-w-[150px]">{info.school_name}</span>
                                    </>
                                  )}
                                  
                                  {/* Info Tooltip Biodata Lengkap */}
                                  <div className="relative group/bio ml-1">
                                    <button className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer">
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                    
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/bio:block bg-slate-900/95 backdrop-blur-md text-white text-[11px] rounded-2xl p-4 shadow-2xl z-50 border border-slate-800 w-72 pointer-events-none transition-all duration-300">
                                      <h4 className="font-black text-[9px] text-indigo-300 uppercase tracking-widest mb-2.5 border-b border-white/10 pb-1.5">Biodata Lengkap Peserta</h4>
                                      <div className="space-y-2 text-left font-sans">
                                        <div className="grid grid-cols-3 gap-1">
                                          <span className="text-slate-400 font-bold">Email:</span>
                                          <span className="col-span-2 font-black truncate">{info.email || '-'}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                          <span className="text-slate-400 font-bold">NISN:</span>
                                          <span className="col-span-2 font-black">{info.nisn || '-'}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                          <span className="text-slate-400 font-bold">Wilayah:</span>
                                          <span className="col-span-2 font-black truncate">{[info.city, info.province].filter(Boolean).join(', ') || '-'}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                          <span className="text-slate-400 font-bold">WhatsApp:</span>
                                          <span className="col-span-2 font-black font-mono">{info.whatsapp || '-'}</span>
                                        </div>
                                        {info.team_name && (
                                          <div className="grid grid-cols-3 gap-1">
                                            <span className="text-slate-400 font-bold">Nama Tim:</span>
                                            <span className="col-span-2 font-black text-amber-300 truncate">{info.team_name}</span>
                                          </div>
                                        )}
                                        {info.mentor_name && (
                                          <div className="grid grid-cols-3 gap-1">
                                            <span className="text-slate-400 font-bold">Pembina:</span>
                                            <span className="col-span-2 font-black truncate">{info.mentor_name.split(' | ')[0]}</span>
                                          </div>
                                        )}
                                        <div className="grid grid-cols-3 gap-1">
                                          <span className="text-slate-400 font-bold">Lomba:</span>
                                          <span className="col-span-2 font-black text-indigo-300 truncate">{info.competition_type || info.category || '-'}</span>
                                        </div>
                                      </div>
                                      <div className="absolute top-full left-3.5 border-4 border-transparent border-t-slate-900"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* SKOR */}
                        <td className="py-4 px-6 text-center">
                          {checkHasUngradedEssay(item) ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                              <Hourglass className="w-3.5 h-3.5 mr-1 animate-spin text-amber-500" /> Ditinjau
                            </span>
                          ) : (
                            <span className={`text-2xl font-black ${score > 0 ? 'text-[#5145cd]' : 'text-gray-300'}`}>
                              {score}
                            </span>
                          )}
                        </td>

                        {/* PELANGGARAN */}
                        <td className="py-4 px-6 text-center">
                          {hasViolations ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-600 border border-rose-100">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" /> {item.violations_count}×
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Aman
                            </span>
                          )}
                        </td>

                        {/* WAKTU */}
                        <td className="py-4 px-6 text-right text-gray-400 font-mono text-xs">
                          <span className="inline-flex items-center justify-end">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </td>

                        {/* TOMBOL REVIEW */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => openReview(item)}
                            disabled={!hasAnswers && !isDone}
                            className={`flex items-center gap-1.5 mx-auto px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              hasAnswers || isDone
                                ? 'bg-[#5145cd] text-white hover:bg-[#3d32a8] shadow-md shadow-indigo-100 hover:-translate-y-0.5'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Review
                          </button>
                        </td>

                        {/* TOMBOL HAPUS PESERTA */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => { setDeleteTargetUser(item.user_id); setShowDeleteParticipant(true); }}
                            title="Hapus data peserta ini"
                            className="flex items-center gap-1.5 mx-auto px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Reset
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
      
      {/* ===== CUSTOM ANIMATED TOAST NOTIFICATION ===== */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed top-6 right-6 z-[999] max-w-sm w-full bg-white border border-gray-100 rounded-[24px] shadow-2xl p-4 flex items-center gap-3.5"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
              toast.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
               toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-gray-900 uppercase tracking-wider">
                {toast.type === 'success' ? 'Berhasil' : toast.type === 'error' ? 'Gagal' : 'Informasi'}
              </p>
              <p className="text-[11px] font-bold text-gray-400 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="w-7 h-7 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full flex items-center justify-center transition-all flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
