"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, PlaySquare, Image as ImageIcon, Users, BookOpen, Search, Trophy } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Image from "next/image";

const filters = ["ALL", "ACADEMIC", "SPEECH", "ARTS", "GALLERY"];

const portfolioItems = [
  {
    "id": "portfolio-0",
    "category": "ARTS",
    "label": "Pertunjukan Musik Kolosal",
    "description": "Harmoni seni musik tradisional dan modern di panggung utama.",
    "src": "/gallery/14upload.jpg",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-1",
    "category": "GALLERY",
    "label": "Upacara Pembukaan NCC",
    "description": "Kemeriahan pembukaan acara nasional yang dihadiri oleh ratusan sekolah.",
    "src": "/gallery/1upload.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-2",
    "category": "SPEECH",
    "label": "Master of Ceremony (MC)",
    "description": "Pembawa acara yang enerjik memandu jalannya kompetisi dengan meriah.",
    "src": "/gallery/21upload.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-3",
    "category": "GALLERY",
    "label": "Keceriaan Seluruh Peserta",
    "description": "Kebersamaan dan persahabatan yang terjalin antarpeserta dari berbagai daerah.",
    "src": "/gallery/22upload.jpg",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-4",
    "category": "ACADEMIC",
    "label": "Penyelesaian Soal Final",
    "description": "Keseriusan peserta dalam menyelesaikan soal babak final akademik.",
    "src": "/gallery/3upload.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-5",
    "category": "GALLERY",
    "label": "Sesi Motivasi Bersama Tokoh",
    "description": "Peserta mendapatkan inspirasi dari tokoh pendidikan nasional.",
    "src": "/gallery/6upload.jpg",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-6",
    "category": "GALLERY",
    "label": "Penghargaan Juara Umum",
    "description": "Momen penyerahan piala bergilir kepada sekolah peraih juara umum.",
    "src": "/gallery/7upload.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-7",
    "category": "GALLERY",
    "label": "Registrasi Ulang Peserta",
    "description": "Antusiasme pendaftaran peserta sejak pagi hari di lokasi acara.",
    "src": "/gallery/B1.jpg",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-8",
    "category": "GALLERY",
    "label": "Panggung Utama Megah",
    "description": "Tata lampu dan desain panggung utama yang menyambut kedatangan peserta.",
    "src": "/gallery/B10.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-9",
    "category": "SPEECH",
    "label": "Persiapan Pidato Final",
    "description": "Peserta melatih intonasi dan vokal sebelum naik ke panggung utama.",
    "src": "/gallery/C2.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-10",
    "category": "ARTS",
    "label": "Penjurian Lomba Mewarnai",
    "description": "Kejelian juri dalam menilai perpaduan warna dan kerapian karya.",
    "src": "/gallery/C5.jpg",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-11",
    "category": "GALLERY",
    "label": "Foto Bersama Finalis",
    "description": "Kebersamaan para finalis setelah menyelesaikan rangkaian lomba.",
    "src": "/gallery/ECL09791.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-12",
    "category": "GALLERY",
    "label": "Penyerahan Sertifikat",
    "description": "Apresiasi kepada juri dan sponsor yang mendukung kesuksesan NCC.",
    "src": "/gallery/ECL09816.JPG",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-13",
    "category": "ACADEMIC",
    "label": "Fokus Ujian Tertulis",
    "description": "Peserta konsentrasi penuh mengerjakan soal ujian di ruang kelas.",
    "src": "/gallery/IMG_7993.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-14",
    "category": "SPEECH",
    "label": "Panggung Pidato Utama",
    "description": "Penampilan salah satu peserta di panggung megah di depan ratusan audiens.",
    "src": "/gallery/IMG_8067.JPG",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-15",
    "category": "ARTS",
    "label": "Proses Menggambar",
    "description": "Peserta menumpahkan kreativitasnya di atas kertas gambar dengan pensil warna.",
    "src": "/gallery/IMG_8103.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-16",
    "category": "ARTS",
    "label": "Sentuhan Akhir Karya",
    "description": "Peserta menyempurnakan detail lukisannya sebelum waktu pengerjaan habis.",
    "src": "/gallery/IMG_8109.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-17",
    "category": "GALLERY",
    "label": "Pengumuman Pemenang",
    "description": "Sorak kegembiraan para pemenang saat nama mereka dibacakan di atas panggung.",
    "src": "/gallery/IMG_8143.JPG",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-18",
    "category": "ACADEMIC",
    "label": "Olimpiade Sains & Matematika",
    "description": "Konsentrasi penuh para peserta dalam menyelesaikan soal-soal teori olimpiade.",
    "src": "/gallery/NCC 1.1.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-19",
    "category": "ACADEMIC",
    "label": "Kompetisi Cerdas Cermat",
    "description": "Keseruan dan ketegangan babak rebutan cerdas cermat bidang akademik.",
    "src": "/gallery/NCC 1.2.jpg",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-20",
    "category": "SPEECH",
    "label": "Lomba Pidato Bahasa Inggris",
    "description": "Penyampaian pidato yang persuasif dan penuh percaya diri oleh peserta.",
    "src": "/gallery/NCC 2.1.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-21",
    "category": "SPEECH",
    "label": "Speech Competition Finalist",
    "description": "Ekspresi meyakinkan dari salah satu finalis lomba pidato di hadapan dewan juri.",
    "src": "/gallery/NCC 2.2.jpg",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-22",
    "category": "ARTS",
    "label": "Lomba Seni Lukis & Desain",
    "description": "Goresan kuas dan warna-warni kreasi peserta menuangkan ide ke kanvas.",
    "src": "/gallery/NCC 3.1.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-23",
    "category": "ARTS",
    "label": "Kreativitas Seni Kriya",
    "description": "Detail kerajinan tangan yang dibuat dengan ketelitian tinggi oleh peserta.",
    "src": "/gallery/NCC 3.2.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-24",
    "category": "ACADEMIC",
    "label": "Presentasi Karya Ilmiah Remaja",
    "description": "Pemaparan hasil penelitian ilmiah di depan dewan penguji.",
    "src": "/gallery/NCC 4.1.jpg",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-25",
    "category": "ACADEMIC",
    "label": "Diskusi Panel Akademik",
    "description": "Sesi tanya jawab yang interaktif antara peserta dengan juri ahli.",
    "src": "/gallery/NCC 4.2.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-26",
    "category": "SPEECH",
    "label": "Kompetisi Debat Bahasa Indonesia",
    "description": "Penyampaian argumen yang logis dan kritis dalam sesi debat aktif.",
    "src": "/gallery/NCC 5.1.jpg",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-27",
    "category": "SPEECH",
    "label": "Debat Final NCC",
    "description": "Momen adu argumen sengit memperebutkan gelar juara debat nasional.",
    "src": "/gallery/NCC 5.2.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-28",
    "category": "ARTS",
    "label": "Kompetisi Fotografi Tematis",
    "description": "Pengambilan sudut pandang unik oleh peserta lomba fotografi lapangan.",
    "src": "/gallery/NCC 6.1.jpg",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-29",
    "category": "ARTS",
    "label": "Pameran Karya Seni Rupa",
    "description": "Pengunjung mengagumi galeri karya seni buatan peserta NCC.",
    "src": "/gallery/NCC 6.2.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-30",
    "category": "ACADEMIC",
    "label": "Lomba Esai Ilmiah",
    "description": "Para peserta menuangkan gagasan solutif mereka dalam bentuk tulisan esai.",
    "src": "/gallery/NCC 7.1.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-31",
    "category": "ACADEMIC",
    "label": "Evaluasi Karya Tulis",
    "description": "Evaluasi mendalam dari dewan juri terhadap karya tulis peserta.",
    "src": "/gallery/NCC 7.2.jpg",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-32",
    "category": "SPEECH",
    "label": "Storytelling Competition",
    "description": "Penyampaian cerita rakyat yang interaktif menggunakan properti kreatif.",
    "src": "/gallery/NCC 8.1.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-33",
    "category": "SPEECH",
    "label": "Ekspresi Storyteller",
    "description": "Penjiwaan karakter yang sangat baik memukau seluruh penonton.",
    "src": "/gallery/NCC 8.2.jpg",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-34",
    "category": "ARTS",
    "label": "Lomba Desain Poster Digital",
    "description": "Kombinasi estetika dan pesan sosial dalam poster digital hasil karya peserta.",
    "src": "/gallery/NCC 9.1.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-35",
    "category": "ARTS",
    "label": "Poster Hasil Karya Finalis",
    "description": "Visualisasi poster yang informatif dan menarik terpajang di area pameran.",
    "src": "/gallery/NCC 9.2.jpg",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-36",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 10",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 10.",
    "src": "/gallery/SLIDE NCC 10TH.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-37",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 1 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 1. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 1st KE 2.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-38",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 1",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 1.",
    "src": "/gallery/SLIDE NCC 1st.JPG",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-39",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 2 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 2. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 2nd KE2.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-40",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 2",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 2.",
    "src": "/gallery/SLIDE NCC 2nd.JPG",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-41",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 3",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 3.",
    "src": "/gallery/SLIDE NCC 3rd .JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-42",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 3 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 3. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 3rd KE 2.JPG",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-43",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 4",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 4.",
    "src": "/gallery/SLIDE NCC 4th ke .JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-44",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 4",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 4.",
    "src": "/gallery/SLIDE NCC 4th.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-45",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 5 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 5. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 5th KE 2.JPG",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-46",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 6 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 6. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 6TH KE 2.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-47",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 6",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 6.",
    "src": "/gallery/SLIDE NCC 6th .JPG",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-48",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 7 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 7. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 7TH KE 2.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-49",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 7",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 7.",
    "src": "/gallery/SLIDE NCC 7TH.JPG",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-50",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 8 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 8. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 8TH KE 2.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-51",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 8",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 8.",
    "src": "/gallery/SLIDE NCC 8TH.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-52",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 9 (Sesi 2)",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 9. Momen tambahan keseruan aktivitas pendukung di panggung utama.",
    "src": "/gallery/SLIDE NCC 9TH KE 2.JPG",
    "span": "col-span-1 md:col-span-2 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-53",
    "category": "GALLERY",
    "label": "Kilas Balik NCC Edisi 9",
    "description": "Dokumentasi bersejarah perjalanan kompetisi tingkat nasional National Creativity Competition edisi 9.",
    "src": "/gallery/SLIDE NCC 9TH.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-54",
    "category": "GALLERY",
    "label": "Foto Bersama Panitia",
    "description": "Kerja keras panitia NCC yang sukses menyelenggarakan acara tahun ini.",
    "src": "/gallery/TERPILIH (2).JPG",
    "span": "col-span-1 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-55",
    "category": "GALLERY",
    "label": "Maskot NCC Berinteraksi",
    "description": "Interaksi seru maskot resmi NCC dengan para pengunjung dan peserta.",
    "src": "/gallery/a.JPG",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-56",
    "category": "ARTS",
    "label": "Pameran Lukisan Peserta",
    "description": "Barisan lukisan hasil karya peserta dipajang rapi di lorong pameran.",
    "src": "/gallery/c4.jpg",
    "span": "col-span-1 md:col-span-2 row-span-2",
    "bg": "from-indigo-500/80 to-purple-600/80"
  },
  {
    "id": "portfolio-57",
    "category": "ACADEMIC",
    "label": "Presentasi Kelompok",
    "description": "Kerja sama tim dalam mempresentasikan proyek inovatif mereka.",
    "src": "/gallery/c8.jpg",
    "span": "col-span-1 row-span-1",
    "bg": "from-indigo-500/80 to-purple-600/80"
  }
];

export default function GallerySection() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [adminMedia, setAdminMedia] = useState<any[]>([]);
  const [galleryTitle, setGalleryTitle] = useState("Moments of Excellence");
  const [gallerySubtitle, setGallerySubtitle] = useState("A glimpse into the spirit, competition, and victory at NCC. Capturing the journey of future leaders across diverse categories.");
  const [hovered, setHovered] = useState<number | string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const fetchGallery = async () => {
      try {
        console.log("GallerySection: Fetching SYS_PORTAL_SETTINGS...");
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('title', 'SYS_PORTAL_SETTINGS')
          .single();
        
        if (error) {
          console.error("GallerySection: Supabase query error:", error);
          return;
        }
        
        if (data) {
          console.log("GallerySection: Successfully fetched portal settings:", data);
          const parsed = JSON.parse(data.content);
          if (parsed.dashboardAssets?.gallery_images) {
            setAdminMedia(parsed.dashboardAssets.gallery_images);
            console.log("GallerySection: Successfully loaded admin gallery images:", parsed.dashboardAssets.gallery_images);
          }
          if (parsed.dashboardAssets?.gallery_title) {
            setGalleryTitle(parsed.dashboardAssets.gallery_title);
          }
          if (parsed.dashboardAssets?.gallery_subtitle) {
            setGallerySubtitle(parsed.dashboardAssets.gallery_subtitle);
          }
        } else {
          console.warn("GallerySection: SYS_PORTAL_SETTINGS row not found in announcements.");
        }
      } catch (err) {
        console.error("GallerySection: Failed to fetch gallery exception:", err);
      }
    };
    fetchGallery();

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const dynamicItems = adminMedia.map((item, index) => {
    const isObject = typeof item === 'object' && item !== null;
    return {
      id: `admin-${index}`,
      category: isObject ? (item.category || "GALLERY") : "GALLERY",
      label: isObject ? (item.label || `Event Moment ${index + 1}`) : `Event Moment ${index + 1}`,
      src: isObject ? item.url : item,
      span: index % 3 === 0 ? "col-span-1 md:col-span-2 row-span-1" : "col-span-1 row-span-1",
      bg: "from-indigo-500/80 to-purple-600/80"
    };
  });

  const allGalleryItems = [...portfolioItems, ...dynamicItems].slice(0, 8);

  const filteredItems = activeFilter === "ALL" 
    ? allGalleryItems 
    : allGalleryItems.filter(item => 
        item.category === activeFilter
      );

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);

    gsap.from(".gsap-gallery-header", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
        toggleActions: "play none none reverse"
      },
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1
    });

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative z-10 py-24 px-6 sm:px-10 bg-transparent flex flex-col items-center">
      <div className="gsap-gallery-header mb-4">
        <span className="px-5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm font-bold text-blue-600 tracking-widest uppercase inline-block shadow-sm">
          National Creativity Competition
        </span>
      </div>
      
      <h3 className="gsap-gallery-header text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4 uppercase text-center" style={{ fontFamily: "var(--font-display)" }}>
        {galleryTitle}
      </h3>
      <p className="gsap-gallery-header text-slate-500 text-center max-w-2xl mb-12">
        {gallerySubtitle}
      </p>

      {/* Filter Tabs */}
      <div className="gsap-gallery-header flex flex-wrap justify-center gap-2 md:gap-4 mb-12">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
               "px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 border",
               activeFilter === filter 
                ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200 scale-105" 
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Masonry / Grid Gallery */}
      {filteredItems.length === 0 ? (
        <div className="w-full max-w-2xl py-16 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm gsap-gallery-header animate-in fade-in duration-500">
          <ImageIcon size={40} className="mb-3 opacity-30 text-slate-500" />
          <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Belum ada dokumentasi</p>
          <p className="text-xs text-slate-400 mt-1">Momen dokumentasi acara akan muncul setelah ditambahkan oleh admin.</p>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[240px] gap-4 grid-flow-row-dense">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                key={item.id}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "relative rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg transition-all duration-500 ease-out",
                  item.span,
                  hovered !== null && hovered !== item.id && !isMobile && allGalleryItems.some(g => g.id === hovered) && "blur-sm scale-[0.98] opacity-60"
                )}
              >
                {/* Image Rendering */}
                <Image 
                  src={item.src} 
                  alt={item.label} 
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  priority={item.id === "admin-0" || item.id === "admin-1"}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Dark Gradient Overlay for readability - Always visible */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-300 pointer-events-none z-10" />

                {/* Trophy Badge - Floating top-right */}
                <div className="absolute top-4 right-4 z-20">
                  <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/25 transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-md">
                    <Trophy size={15} className="text-yellow-400 drop-shadow" />
                  </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 z-20 flex flex-col justify-end transform transition-transform duration-300">
                  <span className="inline-block px-2.5 py-0.5 rounded bg-white/10 backdrop-blur-md text-[9px] font-bold tracking-[0.15em] text-white uppercase border border-white/20 w-fit mb-2">
                    {item.category}
                  </span>
                  
                  <h4 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-md">
                    {item.label}
                  </h4>
                  
                  {item.description && (
                    <p className="text-[11px] sm:text-xs text-white/80 mt-2 leading-relaxed drop-shadow-sm font-medium max-h-0 opacity-0 group-hover:max-h-[80px] group-hover:opacity-100 transition-all duration-500 ease-in-out overflow-hidden">
                      {item.description}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

    </section>
  );
}
