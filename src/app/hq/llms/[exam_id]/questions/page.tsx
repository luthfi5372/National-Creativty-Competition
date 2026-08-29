'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle, 
  FileText, 
  Trash2, 
  Image as PhotoIcon,
  RotateCcw,
  Pencil,
  Upload,
  XCircle,
  Loader2,
  BookOpen
} from 'lucide-react';
import katex from "katex";
import "katex/dist/katex.min.css";

// --- ⚡ MIPA MATH RENDERER ENGINE ---
const renderMath = (text: string) => {
  if (!text) return "";
  let html = text;
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    try { return katex.renderToString(formula, { displayMode: true, throwOnError: false }); } catch (e) { return match; }
  });
  html = html.replace(/\$(.*?)\$/g, (match, formula) => {
    try { return katex.renderToString(formula, { displayMode: false, throwOnError: false }); } catch (e) { return match; }
  });
  return html;
};

const isCorrectAnswerValid = (item: any) => {
  if (!item) return false;
  const qType = item.options?.type || 'pg';
  if (qType === 'isian') {
    return !!item.correct_answer && String(item.correct_answer).trim().length > 0;
  }
  if (qType === 'essay') {
    return true;
  }
  // PG
  if (!item.correct_answer) return false;
  const letters = String(item.correct_answer).toUpperCase().split('');
  if (letters.length === 0) return false;
  return letters.every((l: string) => item.options?.[l] !== undefined);
};

export default function EditorBankSoal() {
  const supabase = createClient();
  const params = useParams();
  const examId = params.exam_id as string; 
  
  // State Form Input
  const [soal, setSoal] = useState('');
  const [opsi, setOpsi] = useState<Record<string, string>>({ A: '', B: '', C: '', D: '', E: '' });
  const [kunciJawaban, setKunciJawaban] = useState('A');
  const [visibleOptions, setVisibleOptions] = useState<string[]>(['A', 'B', 'C', 'D', 'E']);
  const [optionPoints, setOptionPoints] = useState<Record<string, number>>({ A: 4, B: 0, C: 0, D: 0, E: 0 });
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionType, setQuestionType] = useState<'pg' | 'isian' | 'essay'>('pg');
  const [shortAnswerKey, setShortAnswerKey] = useState('');
  const [essayGuide, setEssayGuide] = useState('');

  const toggleKunciJawaban = (huruf: string) => {
    let current = kunciJawaban ? kunciJawaban.toUpperCase() : '';
    if (current.includes(huruf)) {
      current = current.replace(huruf, '');
    } else {
      current += huruf;
    }
    const sorted = current.split('').sort().join('');
    setKunciJawaban(sorted);
  };

  const handleAddOption = () => {
    if (visibleOptions.length >= 25) return;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nextLetter = alphabet[visibleOptions.length];
    setVisibleOptions([...visibleOptions, nextLetter]);
    setOpsi(prev => ({ ...prev, [nextLetter]: '' }));
    setOptionPoints(prev => ({ ...prev, [nextLetter]: 0 }));
  };

  const handleRemoveOption = () => {
    if (visibleOptions.length <= 2) return;
    const lastLetter = visibleOptions[visibleOptions.length - 1];
    const newVisible = visibleOptions.slice(0, -1);
    setVisibleOptions(newVisible);

    const newOpsi = { ...opsi };
    delete newOpsi[lastLetter];
    setOpsi(newOpsi);

    const newPoints = { ...optionPoints };
    delete newPoints[lastLetter];
    setOptionPoints(newPoints);

    if (kunciJawaban.includes(lastLetter)) {
      const newKunci = kunciJawaban.replace(lastLetter, '');
      setKunciJawaban(newKunci || 'A');
    }
  };
  
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [examSubjects, setExamSubjects] = useState<string[]>([]);

  // State Mode Edit & Gambar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  // State Kendali Sistem
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  // 📡 1. TARIK DATA DARI DATABASE
  const fetchSoalTersimpan = async () => {
    const [{ data }, { data: examData }] = await Promise.all([
      supabase
        .from('cbt_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false }),
      supabase
        .from('cbt_exams')
        .select('subject_config')
        .eq('id', examId)
        .maybeSingle()
    ]);
    if (data) {
      const strictlyFiltered = data.filter((q: any) => q.exam_id === examId);
      setDaftarSoal(strictlyFiltered);
    }
    if (examData?.subject_config && Array.isArray(examData.subject_config)) {
      const subjects = (examData.subject_config as any[])
        .map((s: any) => String(s.name || ''))
        .filter((n: string) => n.trim() !== '');
      setExamSubjects(subjects);
    }
  };

  useEffect(() => {
    if (examId) {
      setDaftarSoal([]); // Kosongkan state sebelum narik baru
      fetchSoalTersimpan();
    }
  }, [examId]);

  // 🖼️ 2. HANDLE SELEKSI GAMBAR
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  // 🚀 3. FUNGSI UTAMA: SIMPAN (CREATE / UPDATE) DATA SOAL
  const handleSimpanSoal = async () => {
    if (!soal && !imageFile) {
      showToast("Konten soal teks atau gambar wajib ada!", "error");
      return;
    }
    
    if (questionType === 'pg') {
      if (!opsi.A || !opsi.B) {
        showToast("Opsi jawaban A dan B minimal harus diisi!", "error");
        return;
      }
      // Validasi: pastikan opsi yang dipilih sebagai kunci jawaban tidak kosong
      const correctLetters = (kunciJawaban || '').split('');
      if (correctLetters.length === 0) {
        showToast("Pilih minimal satu kunci jawaban!", "error");
        return;
      }
      for (const letter of correctLetters) {
        if (!opsi[letter]) {
          showToast(`Opsi ${letter} yang dipilih sebagai kunci jawaban masih kosong! Isi terlebih dahulu teks untuk opsi ${letter}.`, "error");
          return;
        }
      }
    } else if (questionType === 'isian') {
      if (!shortAnswerKey.trim()) {
        showToast("Kunci jawaban isian singkat wajib diisi!", "error");
        return;
      }
    }

    setIsSubmitting(true);
    let finalImageUrl = imagePreviewUrl; // Pertahankan URL lama jika mode edit

    try {
      // Proses upload gambar jika ada file baru yang dipilih
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${examId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('question-images')
          .getPublicUrl(filePath);
        
        finalImageUrl = publicUrlData.publicUrl;
      }

      const finalOptions: Record<string, any> = {
        type: questionType,
        points: optionPoints
      };

      if (questionType === 'pg') {
        visibleOptions.forEach(opt => {
          finalOptions[opt] = opsi[opt] || '';
        });
      }

      let finalCorrectAnswer = '';
      if (questionType === 'pg') {
        finalCorrectAnswer = kunciJawaban;
      } else if (questionType === 'isian') {
        finalCorrectAnswer = shortAnswerKey;
      } else {
        finalCorrectAnswer = essayGuide;
      }

      let calculatedWeight = 4;
      if (questionType === 'pg') {
        const values = Object.keys(optionPoints)
          .filter(k => visibleOptions.includes(k))
          .map(k => Number(optionPoints[k] ?? 0));
        calculatedWeight = values.length > 0 ? Math.max(0, ...values) : 4;
      } else if (questionType === 'isian') {
        calculatedWeight = Number(optionPoints.correct ?? 4);
      } else if (questionType === 'essay') {
        calculatedWeight = Number(optionPoints.correct ?? 10);
      }

      const payload = {
        question_text: soal,
        image_url: finalImageUrl,
        options: finalOptions,
        correct_answer: finalCorrectAnswer,
        difficulty: difficulty,
        weight: calculatedWeight,
        subject: selectedSubject.trim() || null,
        status: 'Published'
      };

      if (editingId) {
        // --- MODE UPDATE (EDIT DATA LAMA) ---
        const { error: updateError } = await supabase
          .from('cbt_questions')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setEditingId(null);
      } else {
        // --- MODE INSERT (BUAT SOAL BARU) ---
        const { error: insertError } = await supabase.from('cbt_questions').insert([{
          ...payload,
          exam_id: examId
        }]);

        if (insertError) throw insertError;
      }

      // Bersihkan form kembali seperti semula
      resetForm();
      fetchSoalTersimpan();
      showToast("Soal berhasil disimpan ke database!", "success");

    } catch (error: any) {
      showToast(`Operasi database gagal: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✏️ 4. MASUK KE MODE EDIT (NAIKKAN DATA KE FORM)
  const pemicuEditSoal = (item: any) => {
    setEditingId(item.id);
    setSelectedSubject(item.subject || '');
    
    const qType = item.options?.type || 'pg';
    setQuestionType(qType);

    if (qType === 'pg') {
      // Deteksi apakah data rusak dari CSV (correct_answer berisi karakter selain A-E atau kunci tidak valid)
      const isDataRusak = !item.correct_answer || 
        /[^A-E]/i.test(item.correct_answer) ||
        !isCorrectAnswerValid(item);

      if (isDataRusak) {
        // Data rusak: muat teks soal saja, kosongkan semua opsi & kunci agar admin bisa isi ulang
        setSoal(item.question_text || '');
        setOpsi({ A: '', B: '', C: '', D: '', E: '' });
        setKunciJawaban('A');
        setVisibleOptions(['A', 'B', 'C', 'D', 'E']);
        setOptionPoints({ A: 4, B: 0, C: 0, D: 0, E: 0 });
        setDifficulty(item.difficulty || 'Medium');
        setImagePreviewUrl(item.image_url || null);
        setImageFile(null);
        showToast('⚠️ Data soal ini rusak dari impor CSV. Silakan isi ulang opsi jawaban A-E dan tentukan kunci jawaban.', 'error');
      } else {
        // Data normal: muat semua data ke form
        setSoal(item.question_text);
        
        // Deteksi opsi yang ada secara dinamis (A-Z dengan panjang 1)
        const optionKeys = Object.keys(item.options || {})
          .filter(key => key.length === 1 && key >= 'A' && key <= 'Z')
          .sort();
        
        const finalOptionKeys = optionKeys.length >= 2 ? optionKeys : ['A', 'B', 'C', 'D', 'E'];
        setVisibleOptions(finalOptionKeys);

        const loadedOpsi: Record<string, string> = {};
        finalOptionKeys.forEach(k => {
          loadedOpsi[k] = item.options?.[k] || '';
        });
        setOpsi(loadedOpsi);
        
        setKunciJawaban(item.correct_answer);
        setDifficulty(item.difficulty || 'Medium');
        setImagePreviewUrl(item.image_url || null);
        setImageFile(null);

        // Load custom points if present, otherwise set default points based on correct_answer
        const loadedPoints: Record<string, number> = {};
        finalOptionKeys.forEach(k => {
          loadedPoints[k] = Number(item.options?.points?.[k] ?? 0);
        });

        if (!item.options?.points) {
          const correctLetters = (item.correct_answer || '').toUpperCase().split('');
          correctLetters.forEach((l: string) => {
            if (loadedPoints[l] !== undefined) {
              loadedPoints[l] = 4; // Default to 4 points for correct answers
            }
          });
        }
        setOptionPoints(loadedPoints);
      }
    } else if (qType === 'isian') {
      setSoal(item.question_text || '');
      setShortAnswerKey(item.correct_answer || '');
      setOptionPoints({ correct: Number(item.options?.points?.correct ?? item.weight ?? 4) });
      setDifficulty(item.difficulty || 'Medium');
      setImagePreviewUrl(item.image_url || null);
      setImageFile(null);
    } else if (qType === 'essay') {
      setSoal(item.question_text || '');
      setEssayGuide(item.correct_answer || '');
      setOptionPoints({ correct: Number(item.options?.points?.correct ?? item.weight ?? 10) });
      setDifficulty(item.difficulty || 'Medium');
      setImagePreviewUrl(item.image_url || null);
      setImageFile(null);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 📥 5. BULK IMPORT CSV MASSAL — PARSER RFC 4180 (AMAN UNTUK TEKS BERKOMA)
  const handleBulkImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Apakah Anda yakin ingin mengimpor data massal melalui file CSV ini?")) return;
    setIsImporting(true);

    // ── Parser CSV yang benar: mengerti kutip ganda ───────────────────────────
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (insideQuote && line[i + 1] === '"') {
            // Kutip ganda escaped ("") → satu kutip literal
            current += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (ch === ',' && !insideQuote) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };
    // ─────────────────────────────────────────────────────────────────────────

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        // Normalkan line ending (Windows \r\n → \n)
        const baris = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const dataInsert: any[] = [];
        let skippedCount = 0;
        let errorRows: number[] = [];

        // Skip baris 0 (header)
        for (let i = 1; i < baris.length; i++) {
          if (!baris[i].trim()) continue;

          const kolom = parseCSVLine(baris[i]);

          const soalText      = kolom[0] || '';
          const opsiA         = kolom[1] || '';
          const opsiB         = kolom[2] || '';
          const opsiC         = kolom[3] || '';
          const opsiD         = kolom[4] || '';
          const opsiE         = kolom[5] || '';
          const rawKunci      = (kolom[6] || '').trim().toUpperCase();
          const rawDifficulty = (kolom[7] || '').trim();
          const rawType       = (kolom[8] || '').trim().toLowerCase();
          const type          = ['pg', 'isian', 'essay'].includes(rawType) ? rawType : 'pg';
          const rawSubject    = (kolom[9] || '').trim();

          // Validasi Kunci Jawaban
          let validKunci = '';
          if (type === 'pg') {
            validKunci = /^[A-J]+$/i.test(rawKunci) ? rawKunci.toUpperCase() : '';
            if (!validKunci) {
              errorRows.push(i);
              skippedCount++;
              continue;
            }
            if (!soalText || !opsiA || !opsiB) {
              skippedCount++;
              continue;
            }
          } else if (type === 'isian') {
            validKunci = (kolom[6] || '').trim();
            if (!validKunci) {
              errorRows.push(i);
              skippedCount++;
              continue;
            }
            if (!soalText) {
              skippedCount++;
              continue;
            }
          } else {
            // essay
            validKunci = (kolom[6] || '').trim(); // Opsional panduan
            if (!soalText) {
              skippedCount++;
              continue;
            }
          }

          // Normalisasi tingkat kesulitan
          const diffMap: Record<string, string> = {
            'mudah': 'Easy', 'easy': 'Easy',
            'sedang': 'Medium', 'medium': 'Medium',
            'sulit': 'Hard', 'hard': 'Hard',
          };
          const difficulty = diffMap[rawDifficulty.toLowerCase()] || 'Medium';

          const optionsObj: Record<string, any> = {
            type
          };

          let calculatedWeight = 4;
          if (type === 'pg') {
            optionsObj.A = opsiA;
            optionsObj.B = opsiB;
            if (opsiC) optionsObj.C = opsiC;
            if (opsiD) optionsObj.D = opsiD;
            if (opsiE) optionsObj.E = opsiE;
            optionsObj.points = { A: 4, B: 0, C: 0, D: 0, E: 0 };
            // Assign default points
            const pts = Object.values(optionsObj.points).map(Number);
            calculatedWeight = pts.length > 0 ? Math.max(0, ...pts) : 4;
          } else if (type === 'isian') {
            optionsObj.points = { correct: 4 };
            calculatedWeight = 4;
          } else if (type === 'essay') {
            optionsObj.points = { correct: 10 };
            calculatedWeight = 10;
          }

          // Gunakan offset milidetik agar order created_at stabil saat batch insert
          const qCreatedAt = new Date(Date.now() + i);
          dataInsert.push({
            exam_id: examId,
            question_text: soalText,
            options: optionsObj,
            correct_answer: validKunci,
            difficulty,
            weight: calculatedWeight,
            subject: rawSubject || null,
            status: 'Published',
            created_at: qCreatedAt.toISOString()
          });
        }

        if (dataInsert.length > 0) {
          const { error } = await supabase.from('cbt_questions').insert(dataInsert);
          if (error) throw error;
          fetchSoalTersimpan();

          if (skippedCount > 0) {
            showToast(
              `✅ ${dataInsert.length} soal berhasil diimpor. ⚠️ ${skippedCount} baris dilewati (kunci jawaban tidak valid atau format salah — baris: ${errorRows.slice(0,5).join(', ')}${errorRows.length > 5 ? '...' : ''}). Cek panduan CSV.`,
              'error'
            );
          } else {
            showToast(`✅ Sukses mengimpor ${dataInsert.length} soal! Semua data valid.`, 'success');
          }
        } else if (skippedCount > 0) {
          showToast(`❌ Tidak ada soal yang berhasil diimpor. ${skippedCount} baris dilewati karena format tidak valid. Pastikan kolom Kunci Jawaban hanya berisi A/B/C/D/E.`, 'error');
        }

      } catch (err: any) {
        showToast(`Gagal memproses file CSV: ${err.message}`, "error");
      } finally {
        setIsImporting(false);
        e.target.value = ''; // Reset file input
      }
    };
    reader.readAsText(file);
  };

  const handleHapusSoal = async (id: string) => {
    if (!window.confirm("Hapus permanen soal ini dari sistem?")) return;
    await supabase.from('cbt_questions').delete().eq('id', id);
    fetchSoalTersimpan();
    showToast("Soal berhasil dihapus!", "success");
    if(editingId === id) resetForm();
  };

  const resetForm = () => {
    setSoal('');
    setSelectedSubject('');
    setOpsi({ A: '', B: '', C: '', D: '', E: '' });
    setKunciJawaban('A');
    setVisibleOptions(['A', 'B', 'C', 'D', 'E']);
    setOptionPoints({ A: 4, B: 0, C: 0, D: 0, E: 0 });
    setDifficulty('Medium');
    setQuestionType('pg');
    setShortAnswerKey('');
    setEssayGuide('');
    setEditingId(null);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      
      {/* HEADER UTAMA */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4 text-left">
        <div className="flex items-center space-x-4">
          <Link href="/hq/llms" className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Manajemen Bank Soal</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Sesi ID: {examId?.split('-')[0]}...</p>
          </div>
        </div>

        {/* AREA IMPORT EXCEL/CSV */}
        <div className="flex items-center space-x-3">
          <Link 
            href={`/hq/llms/${examId}/tutorial-csv`}
            className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Panduan CSV
          </Link>

          <label className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-50 cursor-pointer shadow-sm transition-colors">
            {isImporting ? (
              <><RotateCcw className="w-4 h-4 mr-2 animate-spin" /> Mengimpor...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2 text-indigo-500" /> Bulk Import CSV</>
            )}
            <input type="file" accept=".csv" onChange={handleBulkImportCSV} disabled={isImporting} className="hidden" />
          </label>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-widest rounded-xl border border-emerald-100">
            Live Sync
          </div>
        </div>
      </div>

      {/* WORKSPACE AREA (SPLIT VIEW) */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* KIRI: FORM EDITOR INPUT */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full relative">
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center text-left">
              <FileText className="w-6 h-6 text-indigo-600 mr-2" />
              <h2 className="font-bold text-gray-800 text-lg">
                {editingId ? 'Edit Komponen Soal' : 'Input Data Soal'}
              </h2>
            </div>
            
            {/* TAG TINGKAT KESULITAN */}
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="text-xs font-bold uppercase bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-600 outline-none"
            >
              <option value="Easy">Easy (Mudah)</option>
              <option value="Medium">Medium (Sedang)</option>
              <option value="Hard">Hard (HOTS)</option>
            </select>
          </div>

          <div className="space-y-5 flex-grow">
            {/* Input Media/Gambar */}
            <div className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {imagePreviewUrl ? (
                <div className="text-sm text-emerald-600 font-medium flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 mr-2" /> Media gambar siap diunggah
                </div>
              ) : (
                <div className="text-sm text-gray-400 font-medium flex flex-col items-center justify-center">
                  <PhotoIcon className="w-8 h-8 text-gray-300 mb-2 group-hover:text-indigo-500 transition-colors" />
                  Sematkan Gambar Soal (Opsional)
                </div>
              )}
            </div>

            {/* Tipe Soal Dropdown */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-gray-500 uppercase">Tipe Soal</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as any)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none text-sm font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="pg">Pilihan Ganda (Single / Kompleks)</option>
                <option value="isian">Isian Singkat (Auto-Graded)</option>
                <option value="essay">Essai Bebas (Manual-Graded)</option>
              </select>
            </div>

            {/* Input Narasi/Soal */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-gray-500 uppercase">Narasi / Teks Soal</label>
              <textarea
                value={soal} onChange={(e) => setSoal(e.target.value)}
                placeholder="Ketik deskripsi soal di sini... Gunakan $...$ untuk menyisipkan formula rumusan matematika."
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-sm"
              />
            </div>

            {/* Render Form Berdasarkan Tipe Soal */}
            {questionType === 'pg' && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex justify-between items-center">
                  <span>Pernyataan Opsi & Kunci Jawaban</span>
                  <span className="text-indigo-500">Poin Kustom Per Opsi</span>
                </div>

                {visibleOptions.map((huruf) => {
                  const isSelected = (kunciJawaban || '').includes(huruf);
                  const pts = optionPoints[huruf] ?? 0;
                  return (
                    <div key={huruf} className={`rounded-xl border transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-400' : 'border-gray-200 bg-white'}`}>
                      {/* Baris Utama: checkbox + huruf + teks opsi */}
                      <div className="flex items-center p-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleKunciJawaban(huruf)}
                          className="w-4 h-4 text-indigo-600 rounded mx-4 cursor-pointer focus:ring-indigo-500"
                        />
                        <span className={`font-bold w-6 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>{huruf}</span>
                        <input
                          type="text"
                          value={opsi[huruf] || ''}
                          onChange={(e) => setOpsi({ ...opsi, [huruf]: e.target.value })}
                          placeholder={`Isi opsi jawaban ${huruf}...`}
                          className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300 py-2 text-sm"
                        />
                      </div>

                      {/* Baris Poin Kustom */}
                      <div className={`flex items-center gap-2 px-4 py-2 border-t ${isSelected ? 'border-indigo-200 bg-indigo-50/60' : 'border-gray-100 bg-gray-50/60'} rounded-b-xl`}>
                        <span className={`text-[10px] font-black uppercase tracking-wide ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`}>
                          Poin opsi ini:
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            type="button"
                            onClick={() => setOptionPoints({ ...optionPoints, [huruf]: Math.max(0, pts - 1) })}
                            className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 font-black text-sm flex items-center justify-center transition-all"
                          >−</button>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={pts}
                            onChange={(e) => setOptionPoints({ ...optionPoints, [huruf]: Number(e.target.value) || 0 })}
                            className={`w-16 text-center border rounded-lg py-0.5 text-sm font-black outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isSelected ? 'bg-white border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-700'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setOptionPoints({ ...optionPoints, [huruf]: pts + 1 })}
                            className="w-6 h-6 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black text-sm flex items-center justify-center transition-all"
                          >+</button>
                          <span className="text-[10px] font-bold text-gray-400 ml-1">Poin</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Tombol Tambah/Kurang Opsi */}
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddOption}
                    disabled={visibleOptions.length >= 25}
                    className="flex-grow py-2 px-3 border border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 text-[#5145cd] text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    + Tambah Opsi Pilihan
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveOption}
                    disabled={visibleOptions.length <= 2}
                    className="flex-grow py-2 px-3 border border-rose-200 bg-rose-50/30 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    − Kurangi Opsi Pilihan
                  </button>
                </div>

                {/* Ringkasan Total Poin */}
                <div className="mt-1 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex flex-wrap gap-2 items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Ringkasan Poin Soal Ini:</span>
                  <div className="flex gap-2 flex-wrap">
                    {visibleOptions.map(h => (
                      <span key={h} className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${optionPoints[h] > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        {h}: {optionPoints[h] ?? 0} Poin
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {questionType === 'isian' && (
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Kunci Jawaban Singkat (Auto-Graded)</label>
                  <input
                    type="text"
                    value={shortAnswerKey}
                    onChange={(e) => setShortAnswerKey(e.target.value)}
                    placeholder="Contoh: Jakarta (Gunakan | untuk alternatif, misal: Jakarta|DKI Jakarta)"
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
                  />
                  <p className="text-[10px] text-gray-400 font-medium">Penilaian bersifat tidak sensitif huruf besar/kecil (*case-insensitive*).</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Poin Jawaban Benar</label>
                  <input
                    type="number"
                    value={optionPoints.correct ?? 4}
                    onChange={(e) => setOptionPoints({ ...optionPoints, correct: Number(e.target.value) })}
                    className="w-32 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none text-sm font-bold text-center focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {questionType === 'essay' && (
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Panduan Penilaian Juri / Catatan Kunci (Opsional)</label>
                  <textarea
                    value={essayGuide}
                    onChange={(e) => setEssayGuide(e.target.value)}
                    placeholder="Ketik panduan jawaban atau kata kunci penting untuk membantu juri menilai..."
                    className="w-full h-36 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-sm"
                  />
                  <p className="text-[10px] text-gray-400 font-medium">Soal Essai Bebas dinilai secara manual oleh juri, skor otomatis awal dari sistem adalah 0.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Poin Maksimal Soal Essai</label>
                  <input
                    type="number"
                    value={optionPoints.correct ?? 10}
                    onChange={(e) => setOptionPoints({ ...optionPoints, correct: Number(e.target.value) })}
                    className="w-32 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none text-sm font-bold text-center focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-gray-400 font-medium">Bobot poin ini digunakan sebagai batas maksimal nilai saat juri melakukan penilaian.</p>
                </div>
              </div>
            )}
          </div>

          {examSubjects.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Mata Pelajaran</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedSubject('')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${selectedSubject === '' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400'}`}>Umum</button>
                {examSubjects.map(subj => (
                  <button key={subj} type="button" onClick={() => setSelectedSubject(selectedSubject === subj ? '' : subj)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${selectedSubject === subj ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{subj}</button>
                ))}
              </div>
              {selectedSubject && <p className="text-[9px] text-indigo-500 font-bold">📌 Soal ini masuk mapel: {selectedSubject}</p>}
            </div>
          )}

          {/* AKSI TOMBOL UTAMA */}
          <div className="flex space-x-3 mt-8">
            {editingId && (
              <button onClick={resetForm} className="w-1/3 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all flex justify-center items-center">
                <XCircle className="w-5 h-5 mr-2" /> Batal
              </button>
            )}
            <button 
              onClick={handleSimpanSoal} disabled={isSubmitting}
              className={`py-4 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center flex-grow
                ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
            >
              {isSubmitting ? (
                <><RotateCcw className="w-5 h-5 mr-2 animate-spin" /> Menyelaraskan...</>
              ) : editingId ? (
                '💾 Perbarui Data Soal'
              ) : (
                '💾 Simpan Soal ke Database'
              )}
            </button>
          </div>
        </div>

        {/* KANAN: LIVE PREVIEW MODAL MOCKUP (SOFT UI) */}
        <div className="bg-[#f0f4f8] p-6 md:p-8 rounded-3xl border border-indigo-50 flex flex-col relative overflow-hidden text-left">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-ping"></div>
              <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Mockup Layar Peserta</h3>
            </div>
            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider border
              ${difficulty === 'Hard' ? 'bg-red-50 text-red-600 border-red-100' : 
                difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {difficulty}
            </span>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex-grow relative z-10 flex flex-col overflow-y-auto">
            {imagePreviewUrl && (
              <div className="mb-5 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex justify-center p-2 relative">
                <img src={imagePreviewUrl} alt="Preview" className="max-h-40 object-contain rounded-lg" />
              </div>
            )}

            <div 
              className="text-gray-800 text-base mb-8 leading-relaxed font-medium prose-slate"
              dangerouslySetInnerHTML={{ __html: renderMath(soal || "Tulis deskripsi soal di kolom editor kiri...") }}
            />

            <div className="space-y-3 mt-auto">
              {questionType === 'pg' && visibleOptions.map((huruf) => {
                const isCorrect = (kunciJawaban || '').includes(huruf);
                const isMultiSelect = (kunciJawaban || '').length > 1;
                const pts = optionPoints[huruf] ?? 0;
                return (
                  <div key={huruf} className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${isCorrect ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-white'}`}>
                    <span className={`flex items-center justify-center w-7 h-7 flex-shrink-0 ${isMultiSelect ? 'rounded-lg' : 'rounded-full'} text-xs font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {huruf}
                    </span>
                    <div className="flex-grow min-w-0">
                      <div
                        className={`text-sm ${isCorrect ? 'text-emerald-900 font-semibold' : 'text-gray-600'}`}
                        dangerouslySetInnerHTML={{ __html: renderMath(opsi[huruf] || '...') }}
                      />
                    </div>
                    {/* Badge Poin selalu tampil */}
                    <span className={`flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg border ${pts > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                      {pts > 0 ? `+${pts}` : pts} Poin
                    </span>
                    {isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                  </div>
                );
              })}

              {questionType === 'isian' && (
                <div className="w-full space-y-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Kolom jawaban isian singkat peserta..."
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-medium text-sm text-gray-400 cursor-not-allowed"
                  />
                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold leading-relaxed">
                    {shortAnswerKey.trim() && (
                      <>
                        Kunci Jawaban: <span className="font-bold">{shortAnswerKey}</span>
                        <br/>
                      </>
                    )}
                    Poin Jawaban Benar: <span className="font-bold">{optionPoints.correct ?? 4} Poin</span>
                  </div>
                </div>
              )}

              {questionType === 'essay' && (
                <div className="w-full space-y-2">
                  <textarea
                    disabled
                    placeholder="Kolom jawaban essay panjang peserta..."
                    className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-medium text-sm text-gray-400 resize-none cursor-not-allowed"
                  />
                  <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-800 font-semibold leading-relaxed">
                    {essayGuide.trim() && (
                      <>
                        Panduan Penilaian Juri:
                        <p className="mt-1 mb-2 font-medium whitespace-pre-wrap">{essayGuide}</p>
                      </>
                    )}
                    Poin Maksimal Soal Essai: <span className="font-bold">{optionPoints.correct ?? 10} Poin</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- DAFTAR HASIL PENYIMPANAN DATA --- */}
      <div className="max-w-6xl mx-auto mt-12 mb-20 text-left">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center flex-wrap gap-3">
          Soal Terdaftar
          <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-3 py-1 rounded-full">{daftarSoal.length}</span>
          {/* Counter soal belum ada jawaban */}
          {(() => {
            const noAnswer = daftarSoal.filter(q => !isCorrectAnswerValid(q));
            if (noAnswer.length === 0) return (
              <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" /> Semua soal lengkap
              </span>
            );
            return (
              <span className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                <XCircle className="w-3.5 h-3.5" /> {noAnswer.length} soal belum ada kunci jawaban
              </span>
            );
          })()}
        </h3>

        {/* Banner peringatan jika ada soal tidak lengkap */}
        {daftarSoal.some(q => !isCorrectAnswerValid(q)) && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 font-black text-sm">!</div>
            <div>
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Perhatian — Soal Tidak Lengkap</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5 leading-relaxed">
                Soal yang ditandai merah belum memiliki kunci jawaban yang valid. Peserta tetap bisa mengerjakan soal tersebut,
                namun sistem tidak dapat menghitung skor secara akurat. Segera edit dan tentukan kunci jawaban yang benar.
              </p>
            </div>
          </div>
        )}
        
        {daftarSoal.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center text-gray-400 font-medium">
            Belum ada susunan soal yang terdaftar di database untuk sesi ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 text-left">
            {daftarSoal.map((item, index) => (
              <div key={item.id} className={`bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start hover:shadow-md transition-all
                ${editingId === item.id
                  ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-50/10'
                  : !isCorrectAnswerValid(item)
                    ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                    : 'border-gray-100'}`}>
                
                <div className="flex-grow w-full md:pr-6 text-left">
                  {(() => {
                    const qType = item.options?.type || 'pg';
                    return (
                      <>
                        <div className="flex items-center mb-3 flex-wrap gap-2">
                          <span className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">Soal {daftarSoal.length - index}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border
                            ${item.difficulty === 'Hard' ? 'bg-red-50 text-red-600 border-red-100' : 
                              item.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                              'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {item.difficulty || 'Medium'}
                          </span>
                          {item.subject && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-100 text-indigo-600 border border-indigo-200">
                              {item.subject}
                            </span>
                          )}
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-indigo-100">
                            {qType === 'pg' ? 'Pilihan Ganda' : qType === 'isian' ? 'Isian Singkat' : 'Essai Bebas'}
                          </span>
                          {/* Badge peringatan jika belum ada kunci jawaban */}
                          {!isCorrectAnswerValid(item) && (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200">
                              <XCircle className="w-3 h-3" /> Belum Ada Kunci Jawaban
                            </span>
                          )}
                          {/* Badge konfirmasi jika kunci jawaban sudah ada */}
                          {isCorrectAnswerValid(item) && qType !== 'essay' && (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Kunci: {item.correct_answer}
                            </span>
                          )}
                        </div>
                        
                        {item.image_url && <img src={item.image_url} alt="Media" className="h-16 rounded-lg border border-gray-200 mb-3 object-cover" />}
                        <div 
                          className="text-gray-800 mb-4 text-sm font-medium prose-sm"
                          dangerouslySetInnerHTML={{ __html: renderMath(item.question_text) }}
                        />
                        
                        {qType === 'pg' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs text-gray-600">
                            {Object.keys(item.options || {})
                              .filter(key => key.length === 1 && key >= 'A' && key <= 'Z')
                              .sort()
                              .map((opt) => {
                                const val = item.options?.[opt];
                                const isCorrect = String(item.correct_answer || '').toUpperCase().includes(opt);
                                if (!val) return null;
                                return (
                                  <div key={opt} className={`p-3.5 rounded-xl border-2 transition-all flex justify-between items-center ${isCorrect ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{opt}</span>
                                      <span className="truncate" dangerouslySetInnerHTML={{ __html: renderMath(val) }} />
                                    </div>
                                    {item.options?.points?.[opt] !== undefined && item.options.points[opt] !== 0 && (
                                      <span className="text-[9px] text-indigo-600 font-black bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg shrink-0 ml-2">
                                        +{item.options.points[opt]} Poin
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        )}

                        {qType === 'isian' && (
                          <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold max-w-md">
                            Alternatif Kunci Jawaban: <span className="font-bold">{item.correct_answer || '—'}</span>
                            <br/>
                            Bobot Poin: <span className="font-bold">{item.options?.points?.correct ?? 4} Poin</span>
                          </div>
                        )}

                        {qType === 'essay' && (
                          <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl text-xs text-amber-800 font-semibold max-w-md">
                            Panduan Penilaian Juri: <span className="font-bold">{item.correct_answer || '—'}</span>
                            <br/>
                            Poin Maksimal: <span className="font-bold">{item.options?.points?.correct ?? item.weight ?? 10} Poin</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Peringatan inline jika tidak ada kunci jawaban */}
                  {!isCorrectAnswerValid(item) && (
                    <div className="mt-3 flex flex-col gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0" />
                        {/[^A-E]/i.test(item.correct_answer || '')
                          ? 'Data soal ini rusak akibat format CSV yang salah (koma dalam teks). Klik Edit — form akan dibersihkan otomatis, isi ulang opsi dan kunci jawaban.'
                          : 'Soal ini belum memiliki kunci jawaban yang valid. Klik Edit untuk menentukan jawaban yang benar.'
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* SISI TOMBOL KENDALI DATA */}
                <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
                  <button onClick={() => pemicuEditSoal(item)} className={`p-2.5 rounded-xl transition-colors flex items-center text-xs font-semibold ${
                    !isCorrectAnswerValid(item)
                      ? 'text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                      : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                  }`}>
                    <Pencil className="w-5 h-5 md:mr-0 mr-1.5" /> <span className="md:hidden">Edit</span>
                  </button>
                  <button onClick={() => handleHapusSoal(item.id)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center text-xs font-semibold">
                    <Trash2 className="w-5 h-5 md:mr-0 mr-1.5" /> <span className="md:hidden">Hapus</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL TOAST POP-UP ================= */}
      <div className={`fixed bottom-8 right-8 z-[100] transition-all duration-500 transform ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`flex items-center space-x-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900' : 'bg-rose-50/95 border-rose-200 text-rose-900'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-inner font-black ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            {toast.type === 'success' ? '✓' : '✕'}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Notifikasi Sistem</p>
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
