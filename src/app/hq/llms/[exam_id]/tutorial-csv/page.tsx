'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  FileDown, 
  AlertTriangle,
  Table,
  CheckCircle,
  XCircle,
  FileCheck,
  Info,
  BookOpen,
  Lightbulb,
  ShieldAlert,
  Copy
} from 'lucide-react';
import { useState } from 'react';

export default function TutorialCSV() {
  const params = useParams();
  const examId = params.exam_id as string;
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const downloadTemplate = () => {
    // Template dengan kutip ganda agar aman untuk semua teks
    const lines = [
      `"Soal","Opsi A","Opsi B","Opsi C","Opsi D","Opsi E","Kunci Jawaban","Tingkat Kesulitan","Tipe Soal","Mata Pelajaran"`,
      `"Siapakah penemu bola lampu?","Thomas Edison","Isaac Newton","Albert Einstein","Nikola Tesla","James Watt","A","MUDAH","pg","Fisika"`,
      `"Berapa hasil dari 25 x 4?","","","","","","100","MUDAH","isian","Matematika"`,
      `"Jelaskan bagaimana proses terjadinya siklus hujan secara singkat!","","","","","","Kunci: evaporasi, kondensasi, presipitasi","SEDANG","essay","Biologi"`,
    ];
    const csvContent = "data:text/csv;charset=utf-8," + lines.join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Template_Soal_NCC13_v3.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const correctExample = `"Soal","Opsi A","Opsi B","Opsi C","Opsi D","Opsi E","Kunci Jawaban","Tingkat Kesulitan","Tipe Soal","Mata Pelajaran"
"Jika x > y dan y > z, manakah yang pasti benar?","x < z","x = z","x > z","x + y = z","Tidak dapat ditentukan","C","SEDANG","pg","Matematika"
"Apakah ibukota Indonesia?","","","","","","Jakarta|DKI Jakarta","MUDAH","isian","Umum"`;

  const wrongExample1 = `Soal,Opsi A,Opsi B,Opsi C,Opsi D,Opsi E,Kunci Jawaban,Tingkat Kesulitan,Tipe Soal
Jika x > y dan y > z, manakah yang pasti benar?,x < z,x = z,x > z,x + y = z,Tidak dapat ditentukan,C,SEDANG,pg`;

  const wrongExample2 = `"Soal";"Opsi A";"Opsi B";"Kunci";"Kesulitan";"Tipe"
"Berapa 1+1?";"Dua";"Tiga";"A";"MUDAH";"pg"`;

  const wrongExample3 = `"Soal","Opsi A","Opsi B","Kunci","Tipe"
"Jika benar, maka salah. Pilih yang tepat!","Benar","Salah","A","pg"`;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans selection:bg-indigo-100">
      <div className="max-w-5xl mx-auto space-y-8 text-left">

        {/* ─── HEADER ─── */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link href={`/hq/llms/${examId}/questions`} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center tracking-tight">
                <Table className="w-6 h-6 text-indigo-500 mr-2" /> Panduan Lengkap Import CSV
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Baca seluruh panduan ini sebelum mengimpor soal agar tidak ada data yang rusak.</p>
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-100 active:scale-95 whitespace-nowrap"
          >
            <FileDown className="w-5 h-5 mr-2" /> Unduh Template v2
          </button>
        </div>

        {/* ─── PERINGATAN UTAMA ─── */}
        <div className="flex items-start gap-4 p-5 bg-rose-50 border-2 border-rose-200 rounded-3xl">
          <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-black text-rose-700 uppercase tracking-widest">⚠️ Aturan Paling Penting — WAJIB Dibaca</p>
            <p className="text-sm font-bold text-rose-600 mt-1 leading-relaxed">
              Setiap teks yang mengandung <span className="bg-rose-100 px-1.5 py-0.5 rounded font-mono">koma ( , )</span>, <span className="bg-rose-100 px-1.5 py-0.5 rounded font-mono">tanda kutip ( " )</span>, atau <span className="bg-rose-100 px-1.5 py-0.5 rounded font-mono">baris baru</span>{' '}
              HARUS dibungkus dengan tanda kutip ganda <span className="bg-rose-100 px-1.5 py-0.5 rounded font-mono">"..."</span>.{' '}
              Jika tidak, data kolom akan <strong>bergeser dan rusak</strong> — itulah yang menyebabkan soal tidak bisa disimpan kunci jawabannya.
            </p>
          </div>
        </div>

        {/* ─── LANGKAH-LANGKAH ─── */}
        <div>
          <h2 className="text-base font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" /> Langkah Demi Langkah
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { num: '1', color: 'indigo', icon: <FileDown className="w-6 h-6" />, title: 'Unduh Template', desc: 'Klik tombol "Unduh Template v2" di atas. Template sudah menggunakan format kutip ganda yang aman.' },
              { num: '2', color: 'emerald', icon: <Table className="w-6 h-6" />, title: 'Isi di Google Sheets', desc: 'Buka file CSV di Google Sheets (lebih aman dari Excel). Isi per kolom — satu baris = satu soal.' },
              { num: '3', color: 'amber', icon: <FileCheck className="w-6 h-6" />, title: 'Download sebagai CSV', desc: 'Di Google Sheets: File → Unduh → Comma Separated Values (.csv). Jangan ubah format ke Excel.' },
            ].map((s) => (
              <div key={s.num} className={`bg-white p-7 rounded-3xl border border-gray-100 shadow-sm text-left`}>
                <div className={`w-11 h-11 bg-${s.color}-50 text-${s.color}-600 rounded-2xl flex items-center justify-center font-black text-xl mb-5`}>{s.num}</div>
                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── STRUKTUR KOLOM ─── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-7 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-black text-gray-800">Struktur Kolom (9 Kolom Berurutan)</h2>
            <p className="text-xs text-gray-500 mt-1">Kolom TIDAK boleh dikurangi atau ditukar urutannya.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 bg-gray-50/30">
                  <th className="py-4 px-5 text-center w-16">Kolom</th>
                  <th className="py-4 px-5 w-32">Header</th>
                  <th className="py-4 px-5 w-28">Wajib?</th>
                  <th className="py-4 px-5">Aturan & Nilai yang Diizinkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { col: '1', header: 'Soal', wajib: true, color: 'indigo', rule: 'Teks pertanyaan. Jika ada koma atau tanda kutip di dalam teks, bungkus seluruh teks dengan "...". Mendukung formula LaTeX: $...$' },
                  { col: '2', header: 'Opsi A', wajib: false, color: 'slate', rule: 'Teks pilihan A. Wajib diisi untuk tipe soal PG ("pg"). Kosongkan untuk Isian/Essay.' },
                  { col: '3', header: 'Opsi B', wajib: false, color: 'slate', rule: 'Teks pilihan B. Wajib diisi untuk tipe soal PG ("pg"). Kosongkan untuk Isian/Essay.' },
                  { col: '4', header: 'Opsi C', wajib: false, color: 'slate', rule: 'Teks pilihan C. Opsional untuk tipe soal PG.' },
                  { col: '5', header: 'Opsi D', wajib: false, color: 'slate', rule: 'Teks pilihan D. Opsional untuk tipe soal PG.' },
                  { col: '6', header: 'Opsi E', wajib: false, color: 'slate', rule: 'Teks pilihan E. Opsional untuk tipe soal PG.' },
                  { col: '7', header: 'Kunci Jawaban', wajib: true, color: 'emerald', rule: 'Untuk PG: Huruf pilihan benar (misal: A, AC). Untuk Isian Singkat: Kata kunci jawaban benar (contoh: Jakarta|DKI Jakarta). Untuk Essay: Panduan penilaian.' },
                  { col: '8', header: 'Tingkat Kesulitan', wajib: true, color: 'amber', rule: 'Salah satu dari: Easy, Medium, atau Hard (bisa huruf besar/kecil).' },
                  { col: '9', header: 'Tipe Soal', wajib: false, color: 'indigo', rule: 'Isi dengan "pg" (Pilihan Ganda), "isian" (Isian Singkat), atau "essay" (Essai Bebas). Jika kosong, otomatis dianggap "pg".' },
                ].map((row) => (
                  <tr key={row.col} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-5 px-5 text-center">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-${row.color}-50 text-${row.color}-600 font-black font-mono text-sm`}>{row.col}</span>
                    </td>
                    <td className="py-5 px-5 font-bold text-gray-800 whitespace-nowrap">{row.header}</td>
                    <td className="py-5 px-5">
                      {row.wajib
                        ? <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-full border border-rose-100">Wajib</span>
                        : <span className="px-2 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase rounded-full border border-gray-100">Opsional</span>
                      }
                    </td>
                    <td className="py-5 px-5 text-gray-500 leading-relaxed">{row.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── CONTOH BENAR ─── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-7 border-b border-gray-100 bg-emerald-50/40 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <h2 className="text-sm font-black text-emerald-700 uppercase tracking-widest">✅ Contoh Format yang BENAR</h2>
              <p className="text-xs text-emerald-600 mt-0.5">Semua teks dibungkus kutip ganda — aman dari masalah koma di dalam teks.</p>
            </div>
          </div>
          <div className="p-5 relative">
            <button
              onClick={() => handleCopy(correctExample, 0)}
              className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <Copy className="w-3 h-3" /> {copiedIdx === 0 ? 'Disalin!' : 'Salin'}
            </button>
            <pre className="font-mono text-[11px] text-gray-700 bg-gray-50 border border-gray-100 rounded-2xl p-5 overflow-x-auto whitespace-pre leading-6">
{`"Soal","Opsi A","Opsi B","Opsi C","Opsi D","Opsi E","Kunci Jawaban","Tingkat Kesulitan","Tipe Soal"
"Jika x > y dan y > z, manakah yang pasti benar?","x < z","x = z","x > z","x + y = z","Tidak dapat ditentukan","C","SEDANG","pg"
"Apakah ibukota Indonesia?","","","","","","Jakarta|DKI Jakarta","MUDAH","isian"
"Sebutkan 3 macam zat pengisi termometer!","","","","","","alkohol|raksa|merkuri","SULIT","isian"`}
            </pre>
          </div>
        </div>

        {/* ─── 3 CONTOH SALAH ─── */}
        <div>
          <h2 className="text-base font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-500" /> Kesalahan yang Sering Terjadi
          </h2>
          <div className="space-y-5">

            {/* Kesalahan 1 */}
            <div className="bg-white rounded-3xl border-2 border-rose-100 overflow-hidden">
              <div className="p-5 bg-rose-50/50 border-b border-rose-100 flex items-start gap-3">
                <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">1</span>
                <div>
                  <p className="text-sm font-black text-rose-700">Teks soal punya koma tapi tidak dibungkus kutip ganda</p>
                  <p className="text-xs text-rose-500 mt-0.5">Ini penyebab utama soal rusak dan kunci jawaban tidak bisa disimpan!</p>
                </div>
              </div>
              <div className="p-5 grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">❌ Salah — Tanpa Kutip</p>
                  <pre className="font-mono text-[10px] bg-rose-50 border border-rose-100 rounded-xl p-4 overflow-x-auto whitespace-pre leading-5 text-gray-600">
{`Soal,Opsi A,Opsi B,Opsi C,Opsi D,Opsi E,Kunci,Kesulitan
Jika x > y dan y > z, mana yang benar?,x<z,x=z,x>z,x+y=z,Tidak tentu,C,SEDANG
↑ koma setelah "z" membuat sistem berpikir soal selesai di sini
↑ kolom bergeser → "mana yang benar?" masuk ke Opsi A
↑ kunci jawaban berisi teks panjang bukan "C"`}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">✅ Benar — Dengan Kutip</p>
                  <pre className="font-mono text-[10px] bg-emerald-50 border border-emerald-100 rounded-xl p-4 overflow-x-auto whitespace-pre leading-5 text-gray-600">
{`"Soal","Opsi A","Opsi B","Opsi C","Opsi D","Opsi E","Kunci","Kesulitan"
"Jika x > y dan y > z, mana yang benar?","x<z","x=z","x>z","x+y=z","Tidak tentu","C","SEDANG"
↑ koma di dalam teks soal aman karena dibungkus "..."
↑ sistem baca 8 kolom dengan tepat
↑ kunci jawaban = "C" ✓`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Kesalahan 2 */}
            <div className="bg-white rounded-3xl border-2 border-rose-100 overflow-hidden">
              <div className="p-5 bg-rose-50/50 border-b border-rose-100 flex items-start gap-3">
                <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">2</span>
                <div>
                  <p className="text-sm font-black text-rose-700">Menggunakan titik koma ( ; ) sebagai pemisah kolom</p>
                  <p className="text-xs text-rose-500 mt-0.5">Excel regional Indonesia sering memakai titik koma secara default — sistem NCC hanya baca koma.</p>
                </div>
              </div>
              <div className="p-5 grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">❌ Salah — Titik Koma</p>
                  <pre className="font-mono text-[10px] bg-rose-50 border border-rose-100 rounded-xl p-4 overflow-x-auto whitespace-pre leading-5 text-gray-600">
{`"Soal";"Opsi A";"Opsi B";"Opsi C";"Opsi D";"Opsi E";"Kunci";"Kesulitan"
"Berapa 1+1?";"Dua";"Tiga";"Empat";"Lima";"Enam";"A";"MUDAH"`}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">✅ Benar — Koma</p>
                  <pre className="font-mono text-[10px] bg-emerald-50 border border-emerald-100 rounded-xl p-4 overflow-x-auto whitespace-pre leading-5 text-gray-600">
{`"Soal","Opsi A","Opsi B","Opsi C","Opsi D","Opsi E","Kunci","Kesulitan"
"Berapa 1+1?","Dua","Tiga","Empat","Lima","Enam","A","MUDAH"`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Kesalahan 3 */}
            <div className="bg-white rounded-3xl border-2 border-rose-100 overflow-hidden">
              <div className="p-5 bg-rose-50/50 border-b border-rose-100 flex items-start gap-3">
                <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">3</span>
                <div>
                  <p className="text-sm font-black text-rose-700">Kolom Kunci Jawaban berisi teks panjang, bukan 1 huruf</p>
                  <p className="text-xs text-rose-500 mt-0.5">Kolom ke-7 hanya boleh berisi: A, B, C, D, atau E — satu karakter saja.</p>
                </div>
              </div>
              <div className="p-5 grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">❌ Salah — Teks Panjang di Kunci</p>
                  <pre className="font-mono text-[10px] bg-rose-50 border border-rose-100 rounded-xl p-4 overflow-x-auto whitespace-pre leading-5 text-gray-600">
{`"Soal","Opsi A","Opsi B","Kunci Jawaban"
"Berapa 2+2?","3","4","Empat"      ← salah, bukan huruf
"Berapa 3x3?","9","8","jawaban A"  ← salah, harus cukup "A"
"Ibu kota RI?","Jakarta","Surabaya","A. Jakarta" ← salah`}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">✅ Benar — 1 Huruf Saja</p>
                  <pre className="font-mono text-[10px] bg-emerald-50 border border-emerald-100 rounded-xl p-4 overflow-x-auto whitespace-pre leading-5 text-gray-600">
{`"Soal","Opsi A","Opsi B","Kunci Jawaban"
"Berapa 2+2?","3","4","B"      ← benar
"Berapa 3x3?","9","8","A"      ← benar
"Ibu kota RI?","Jakarta","Surabaya","A" ← benar`}
                  </pre>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── ATURAN LENGKAP ─── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-7 border-b border-gray-100 bg-indigo-50/30 flex items-center gap-3">
            <Info className="w-6 h-6 text-indigo-500 shrink-0" />
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Aturan Lengkap yang Harus Dipatuhi</h2>
          </div>
          <div className="p-7 grid md:grid-cols-2 gap-6">
            {[
              { icon: '📌', title: 'Baris pertama = header', desc: 'Baris pertama HARUS berisi nama kolom persis seperti template 9 kolom. Jangan diubah.' },
              { icon: '🔤', title: 'Kunci jawaban disesuaikan', desc: 'Untuk PG: Huruf pilihan (A-J). Untuk Isian: Kata kunci teks (pisahkan alternatif dengan |). Untuk Essay: Panduan nilai.' },
              { icon: '📝', title: 'Tipe soal opsional', desc: 'Kolom ke-9 diisi dengan "pg", "isian", atau "essay". Jika dikosongkan, default ke Pilihan Ganda (pg).' },
              { icon: '🚫', title: 'Jangan merge sel di Excel', desc: 'Merge cell akan merusak struktur CSV. Pastikan setiap sel berdiri sendiri.' },
              { icon: '💬', title: 'Teks berkoma = wajib dikutip', desc: 'Jika teks soal/opsi mengandung koma, bungkus seluruh teks dengan tanda kutip ganda: "Jika A, maka B".' },
              { icon: '🔢', title: 'Angka dalam teks = aman', desc: 'Angka seperti 100, 3.14, atau -5 tidak perlu dikutip asalkan tidak mengandung koma.' },
              { icon: '📐', title: 'Rumus matematika', desc: 'Gunakan $...$ untuk inline dan $$...$$ untuk display. Contoh: "$x^2 + y^2 = z^2$".' },
              { icon: '🌐', title: 'Gunakan Google Sheets', desc: 'Lebih aman dari Excel. Export via File → Unduh → CSV. Encoding otomatis UTF-8.' },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                <span className="text-xl shrink-0">{rule.icon}</span>
                <div>
                  <p className="text-xs font-black text-gray-800">{rule.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── TIPS GOOGLE SHEETS ─── */}
        <div className="flex items-start gap-4 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl">
          <Lightbulb className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-700 mb-2">💡 Tips: Cara Export CSV yang Benar dari Google Sheets</p>
            <ol className="text-xs text-amber-700 font-semibold space-y-1 list-decimal list-inside leading-relaxed">
              <li>Buka file di Google Sheets</li>
              <li>Klik menu <strong>File</strong> → <strong>Unduh</strong> → <strong>Nilai yang Dipisahkan Koma (.csv)</strong></li>
              <li>File akan terunduh otomatis dengan format koma (bukan titik koma)</li>
              <li>Upload file tersebut langsung ke tombol Import CSV di halaman bank soal</li>
              <li><strong>Jangan buka file CSV hasil download di Excel</strong> — bisa mengubah format secara otomatis</li>
            </ol>
          </div>
        </div>

        {/* ─── CHECKLIST ─── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-5 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" /> Checklist Sebelum Import
          </h2>
          <div className="space-y-3">
            {[
              'Baris pertama berisi header yang benar (9 kolom sesuai urutan)',
              'Semua teks soal dan opsi yang mengandung koma sudah dibungkus kutip ganda "..."',
              'Kolom Kunci Jawaban berisi kunci jawaban yang sesuai dengan tipe soal',
              'Kolom Tingkat Kesulitan hanya berisi: Easy, Medium, atau Hard',
              'Kolom Tipe Soal hanya berisi: pg, isian, atau essay',
              'Tidak ada baris yang kosong di tengah-tengah data',
              'File disimpan dalam format CSV, bukan .xlsx atau .xls',
              'Pemisah kolom adalah koma (,) bukan titik koma (;)',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-5 h-5 rounded border-2 border-gray-200 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 font-medium leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
