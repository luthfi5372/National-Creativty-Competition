<p align="center">
  <img src="public/docs/banner.jpg" alt="National Creativity Competition Banner" width="100%" style="border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.35);" />
</p>

<h1 align="center">🏆 National Creativity Competition (NCC)</h1>

<p align="center">
  <strong>Platform Kompetisi Nasional Full-Stack & Computer-Based Testing (CBT) Modern</strong><br>
  Dirancang dengan Next.js 16 (App Router), Supabase PostgreSQL, Realtime Proctoring, dan Tailwind CSS v4.
</p>

<p align="center">
  <a href="https://national-creativty-competition.vercel.app"><img src="https://img.shields.io/badge/Production%20Website-Live-4f46e5?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Site" /></a>
  <a href="https://github.com/luthfi5372/National-Creativty-Competition"><img src="https://img.shields.io/badge/GitHub-Repository-24292e?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
  <img src="https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

## 📋 Daftar Isi

1. [Visualisasi Arsitektur Sistem](#-visualisasi-arsitektur-sistem)
2. [Visualisasi Database Schema (ERD)](#-visualisasi-database-schema-erd)
3. [Alur Autentikasi & Self-Healing](#-alur-autentikasi--self-healing)
4. [Central Command HQ (Admin Panel)](#-central-command-hq-admin-panel)
5. [Sistem CBT & Real-Time Proctoring](#-sistem-cbt--real-time-proctoring)
6. [Struktur Folder & Komponen](#-struktur-folder--komponen)
7. [Environment Variables](#-environment-variables)
8. [Panduan Menjalankan Lokal](#-panduan-menjalankan-lokal)
9. [Halaman & Route Guards](#-halaman--route-guards)
10. [Panduan Modifikasi Setiap Fitur](#-panduan-modifikasi-setiap-fitur)
11. [Troubleshooting & Solusi Error](#-troubleshooting--solusi-error)

---

## 🏗 Visualisasi Arsitektur Sistem

Diagram interaktif di bawah menggambarkan bagaimana setiap layer dari antarmuka pengguna hingga infrastruktur database terhubung secara realtime:

```mermaid
flowchart TD
    subgraph Client["💻 BROWSER CLIENT LAYER"]
        Landing["🌐 Landing Page (HomeClient & Canvas 3D)"]
        Peserta["👤 Peserta Dashboard & Registration Form"]
        ExamRoom["📝 CBT Exam Room (Cheat Radar & Smart Timer)"]
        HQ["🛡️ HQ Central Command Panel (Real-Time Monitor)"]
        Juri["⚖️ Panel Evaluasi Juri & Scoring"]
    end

    subgraph Edge["⚡ NEXT.JS 16 & VERCEL SERVERLESS LAYER"]
        MW["🚦 Route Middleware (Route Guards, JWT & Cookie Hint)"]
        SA["⚙️ Server Actions (auth.ts: Self-Healing & Data Sync)"]
        API["📡 API Endpoints (/api/cbt/* & /api/inspect)"]
    end

    subgraph Backend["🔥 SUPABASE CLOUD INFRASTRUCTURE"]
        AuthService["🔑 Supabase Auth (JWT Engine, Auto-Confirm Admin API)"]
        Postgres[("🗄️ PostgreSQL Database (11 Relational Tables)")]
        StorageBucket["📦 Storage Buckets (Payment-Proofs, Questions, Avatars)"]
        RealtimeEngine["⚡ Realtime Engine (WebSocket Channels for Monitoring)"]
    end

    Landing -->|HTTPS / Next Route| MW
    Peserta -->|Session Cookie| MW
    ExamRoom -->|Attempt Sync| MW
    HQ -->|Admin Credentials| MW
    Juri -->|Jury Token| MW

    MW --> SA
    MW --> API

    SA -->|Admin Client / Service Key| AuthService
    SA -->|Direct CRUD Query| Postgres
    SA -->|Secure File Upload| StorageBucket

    ExamRoom <-->|Live Violation & Progress| RealtimeEngine
    HQ <-->|Live Attendance & Leaderboard Stream| RealtimeEngine
    RealtimeEngine <--> Postgres
```

---

## 🗄 Visualisasi Database Schema (ERD)

Relasi antar tabel utama di PostgreSQL Supabase digambarkan pada diagram Entity-Relationship berikut:

```mermaid
erDiagram
    auth_users ||--|| profiles : "has profile"
    auth_users ||--o{ competition_entries : "submits registration"
    auth_users ||--o{ cbt_attempts : "takes examination"
    
    cbt_exams ||--o{ cbt_questions : "contains bank of questions"
    cbt_exams ||--o{ cbt_attempts : "hosts exam session"
    
    competition_entries ||--o{ jury_scores : "evaluated by jury"
    
    profiles {
        uuid id PK
        string username
        string full_name
        string school
        string npsn
        string email
        string phone
    }

    competition_entries {
        uuid id PK
        uuid user_id FK
        string full_name
        string email
        string school_name
        string npsn
        string competition_type
        string payment_status
        string payment_proof_url
        string submission_url
        jsonb notes
    }

    cbt_exams {
        uuid id PK
        string title
        string token
        int duration_minutes
        boolean is_active
        boolean shuffle_questions
        string scoring_system
        numeric correct_point
        numeric penalty_point
        int question_count
        jsonb subject_config
    }

    cbt_questions {
        uuid id PK
        uuid exam_id FK
        text question_text
        text image_url
        jsonb options
        string correct_answer
        string difficulty
        string subject
        numeric weight
    }

    cbt_attempts {
        uuid id PK
        uuid user_id FK
        uuid exam_id FK
        jsonb answers
        numeric score
        int violations_count
        string status
        timestamp started_at
        timestamp submitted_at
    }

    jury_scores {
        uuid id PK
        uuid entry_id FK
        string jury_email
        jsonb scores
        numeric total_score
        text notes
    }
```

---

## 🔑 Alur Autentikasi & Self-Healing

Sistem autentikasi dilengkapi dengan mekanisme **Self-Healing** dan **Dual-Phase Token Persistence** untuk mengatasi email unconfirmed dan mismatch sesi server-client:

```mermaid
sequenceDiagram
    autonumber
    actor User as Peserta / Admin
    participant Browser as Browser Client (LoginForm.tsx)
    participant ServerAction as Server Action (auth.ts)
    participant AdminAPI as Supabase Admin API (Service Role)
    participant SupabaseAuth as Supabase Auth Engine

    User->>Browser: Masukkan Email/Username & Kata Sandi
    Browser->>ServerAction: loginLocalUser(formData)

    alt Admin Stealth Mode Bypass
        ServerAction-->>Browser: Set cookie ncc_admin_hint & ncc_hint
        Browser-->>User: Redirect instan ke /hq
    else Normal Participant Login
        ServerAction->>SupabaseAuth: signInWithPassword(email, password)
        
        opt Error: "Email not confirmed"
            ServerAction->>AdminAPI: admin.updateUserById(userId, email_confirm=true)
            ServerAction->>SupabaseAuth: Retry signInWithPassword
        end

        opt Error: Password Mismatch / Legacy NISN
            ServerAction->>ServerAction: Lookup competition_entries.notes (custom_password / NISN)
            ServerAction->>AdminAPI: Auto-heal password & upsert auth user
            ServerAction->>SupabaseAuth: Retry signInWithPassword
        end

        ServerAction-->>Browser: Return { success: true, resolvedEmail, isAdmin }
        
        Note over Browser,SupabaseAuth: Phase 2: Client-Side Session Lock
        Browser->>SupabaseAuth: supabase.auth.signInWithPassword(resolvedEmail, password)
        Browser->>Browser: Set browser session storage & cookies
        Browser-->>User: Redirect ke /dashboard
    end
```

---

## 🛡 Central Command HQ (Admin Panel)

<p align="center">
  <img src="public/docs/hq_preview.jpg" alt="Central Command HQ Dashboard Preview" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);" />
</p>

File Utama: `src/app/hq/page.tsx`  
Akses: Khusus Admin (`admin@ncc.id`, `admin1@ncc.id`, `halo.ncc@gmail.com`)

### Fitur-Fitur Utama HQ

| Modul | Deskripsi | File Implementasi |
|-------|-----------|-------------------|
| **Sebaran Geografis** | Peta interaktif 34 provinsi dengan indikator kepadatan persentase pendaftar | `src/components/IndonesiaMap.tsx` |
| **Verifikasi Pembayaran** | Approve/Reject bukti bayar slip transfer secara real-time | `src/components/hq/VerificationTab.tsx` |
| **Participant Registry** | CRUD peserta, pencarian cerdas, filter instansi/NPSN, dan kartu peserta | `src/components/hq/UserRegistryTab.tsx` |
| **Export Data CSV** | Unduh seluruh data registrasi dalam format CSV rapi dengan auto-quoting | `src/app/hq/page.tsx` |
| **Live Broadcast** | Kirim pengumuman darurat langsung ke banner layar peserta | `src/app/hq/llms/broadcast/page.tsx` |
| **QR Code Scanner** | Validasi kehadiran peserta di venue melalui pemindaian kartu ID | `html5-qrcode` integration |

---

## 📝 Sistem CBT & Real-Time Proctoring

<p align="center">
  <img src="public/docs/cbt_preview.jpg" alt="CBT Online Examination & Proctoring Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);" />
</p>

File Ruang Ujian: `src/app/ujian/[exam_id]/page.tsx`  
File Monitor Admin: `src/app/hq/llms/[exam_id]/monitor/page.tsx`

### Siklus Pengerjaan Ujian (CBT Lifecycle)

```mermaid
flowchart LR
    A["🔑 Masuk Token Ujian"] --> B["📋 Dashboard Verifikasi Peserta"]
    B --> C["⏱️ Mulai Ujian (started_at terkunci)"]
    C --> D["📝 Pengerjaan Soal (Smart Shuffle & Mapel)"]
    
    subgraph Proctoring["🛡️ Proctoring Radar Engine"]
        D -.->|Deteksi Tab Switch / Blur| W1["⚠️ Peringatan Pelanggaran #1"]
        W1 -.->|Deteksi Copy Paste / Esc| W2["⚠️ Peringatan Pelanggaran #2"]
        W2 -.->|Pelanggaran ke-3| W3["🚨 Auto-Submit Paksa"]
    end

    D -->|Waktu Habis / Tombol Selesai| Submit["🏁 Finalisasi & Submit Jawaban"]
    W3 --> Submit
    Submit --> Scoring["📊 Auto-Grading (Fixed / Custom / Penalty)"]
    Scoring --> Leaderboard["🏆 Real-Time Leaderboard HQ"]
```

### Fitur Kunci Sistem CBT
1. **Smart Question Bank & Subject Config**: Soal dapat diacak secara umum atau dibagi per mata pelajaran (misal: 20 Matematika, 15 Fisika, 15 Kimia dari bank 200 soal).
2. **Resume Timer Resilient**: Jika peserta me-refresh halaman atau internet terputus, durasi waktu dihitung akurat dari selisih `started_at` di database terhadap waktu sekarang.
3. **Cheat Radar**: Mendeteksi perpindahan tab browser, minimize, pembukaan devtools, dan kombinasi shortcut keyboard.
4. **Skema Penilaian Multi-Mode**:
   - `Fixed`: Poin seragam untuk setiap soal benar.
   - `Custom`: Poin berbobot per butir soal.
   - `Penalty`: Pengurangan skor jika jawaban salah (sistem minus).

---

## 📁 Struktur Folder & Komponen

```
National-Creativty-Competition-main/
├── public/                           ← Aset statis (logo, gambar lomba, guidebook)
│   ├── docs/                         ← Gambar visualisasi README
│   │   ├── banner.jpg                ← Hero Banner NCC 2026
│   │   ├── hq_preview.jpg            ← Preview Dashboard Central Command HQ
│   │   └── cbt_preview.jpg           ← Preview Ruang Ujian CBT & Radar Anti-Cheat
│   ├── mascots.png                   ← Maskot resmi Nicco & Nicci
│   └── juknis/                       ← Petunjuk teknis PDF tiap cabang lomba
│
├── src/
│   ├── app/                          ← App Router Pages
│   │   ├── page.tsx                  ← Landing page utama
│   │   ├── login/                    ← Form login peserta & admin
│   │   ├── register/                 ← Form registrasi umum
│   │   ├── daftar/                   ← Form registrasi berbasis NPSN sekolah
│   │   ├── dashboard/                ← Portal peserta terdaftar
│   │   ├── hq/                       ← Central Command Admin HQ
│   │   │   ├── llms/                 ← CBT Exam Manager & Question Bank
│   │   │   │   └── [exam_id]/        ← Monitor ujian, soal, dan leaderboard
│   │   │   └── participants/         ← Manajemen data peserta lanjutan
│   │   ├── ujian/                    ← Portal pelaksanaan CBT peserta
│   │   │   └── [exam_id]/            ← Ruang pengerjaan ujian aktif
│   │   ├── juri/                     ← Portal juri untuk evaluasi karya
│   │   └── actions/auth.ts           ← Server actions autentikasi & database
│   │
│   ├── components/                   ← Komponen UI Reusable
│   │   ├── Navbar.tsx                ← Navigasi responsif dengan status login
│   │   ├── HeroSection.tsx           ← Hero interaktif & CTA pendaftaran
│   │   ├── TimelineSection.tsx       ← Timeline roadmap kegiatan NCC
│   │   ├── CategoryCards.tsx         ← Kartu 4 cabang lomba & rincian biaya
│   │   ├── IndonesiaMap.tsx          ← Visualisasi sebaran peserta per provinsi
│   │   ├── dashboard/                ← Komponen dashboard peserta (ID Card, Status)
│   │   ├── exam/CheatRadar.tsx       ← Widget radar anti-cheat visual
│   │   └── hq/                       ← Widget tab panel admin HQ
│   │
│   ├── lib/supabase/                 ← Klien Supabase (Browser, Server SSR, Admin)
│   ├── hooks/                        ← Custom React Hooks (useLiveStats, useAdvancedProctoring)
│   └── middleware.ts                 ← Global route guard & security headers
```

---

## 🔐 Environment Variables

Konfigurasikan variabel lingkungan berikut di `.env.local` untuk lokal dan di **Vercel Project Settings > Environment Variables** untuk produksi:

```env
# URL Instance Supabase
NEXT_PUBLIC_SUPABASE_URL=https://afwuyizfsoevcffnhfbk.supabase.co

# Kunci Anonim Publik (Client-Side Safe)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Kunci Service Role (Bypass RLS & Auto-Confirm Email - WAJIB DI VERCEL!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Integrasi Email Transaksional (Opsional)
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

## 🚀 Panduan Menjalankan Lokal

```bash
# 1. Kloning repository dari GitHub
git clone https://github.com/luthfi5372/National-Creativty-Competition.git
cd National-Creativty-Competition

# 2. Pasang semua dependensi modul
npm install

# 3. Siapkan file environment variables lokal
cp .env.example .env.local
# Lengkapi kredensial Supabase Anda di .env.local

# 4. Jalankan development server
npm run dev

# 5. Buka di browser: http://localhost:3000
```

---

## 🚦 Halaman & Route Guards

Sistem proteksi rute diatur secara terpusat pada file `src/middleware.ts`:

| Route Path | Level Akses | Kebijakan Redirect Jika Gagal |
|------------|-------------|-------------------------------|
| `/` | **Publik** | Dapat diakses siapapun |
| `/login`, `/register`, `/daftar` | **Publik** | Jika sudah login, diarahkan ke `/dashboard` |
| `/dashboard/*` | **Peserta Terotentikasi** | Redirect ke `/login` jika tidak ada sesi |
| `/hq/*` | **Khusus Admin** | Redirect ke `/login` jika anon, redirect ke `/dashboard` jika bukan admin |
| `/juri/*` | **Admin atau Juri** | Redirect ke `/login` jika anon, redirect ke `/dashboard` jika tidak berhak |
| `/ujian/[exam_id]` | **Peserta Terotentikasi** | Wajib verifikasi sesi akun & token ujian aktif |

---

## 🔧 Panduan Modifikasi Setiap Fitur

### 1. Mengubah Kategori Lomba & Biaya Pendaftaran
Edit berkas: `src/components/CategoryCards.tsx` dan `src/components/dashboard/RegistrationModal.tsx`
```tsx
// Contoh penyesuaian kategori di CategoryCards.tsx:
export const CATEGORIES = [
  {
    name: "Olimpiade MIPA",
    price: "Rp 150.000",
    color: "from-blue-500 to-indigo-600",
    description: "Kompetisi Matematika dan IPA tingkat nasional...",
  },
  // Tambah kategori baru di sini
];
```

### 2. Mengubah Timeline & Jadwal Kegiatan
Edit berkas: `src/components/TimelineSection.tsx`
```tsx
const timelineEvents = [
  {
    date: "10 April 2026",
    title: "Pendaftaran Gelombang 1",
    desc: "Pembukaan registrasi awal bagi seluruh kontingen sekolah.",
  },
  // Perbarui jadwal tanggal di sini
];
```

### 3. Menambah Akun Admin atau Juri Baru
Tambahkan email admin pada daftar string di:
- `src/middleware.ts` → array `ADMIN_EMAILS`
- `src/app/actions/auth.ts` → array `adminEmails`
- `src/app/juri/page.tsx` → array `JURI_EMAILS`

### 4. Menyesuaikan Aturan Anti-Cheat Ujian (Batas Maksimal Pelanggaran)
Edit berkas: `src/app/ujian/[exam_id]/page.tsx`
```tsx
// Cari baris deklarasi batas pelanggaran:
const MAX_VIOLATIONS = 3; // Ubah angka toleransi (misal 5 kali peringatan)
```

---

## 🐛 Troubleshooting & Solusi Error

### 🔴 Masalah 1: Peserta Bisa Daftar tapi Tidak Bisa Login
- **Penyebab**: Email Supabase memerlukan verifikasi manual sementara user belum klik tautan konfirmasi.
- **Solusi yang Diterapkan**: Server action `loginLocalUser` dan `syncEntryOnDaftar` telah dilengkapi **Auto-Confirm Email via Admin API**. Pastikan variable `SUPABASE_SERVICE_ROLE_KEY` telah terpasang di Vercel Dashboard agar fungsi auto-confirm aktif di serverless.

### 🔴 Masalah 2: Sesi Peserta Hilang Saat Masuk Halaman Dashboard
- **Penyebab**: Session cookie Supabase hanya tersimpan di server header dan belum tersinkronisasi di storage browser.
- **Solusi**: Form login (`src/app/login/LoginForm.tsx`) kini menjalankan `signInWithPassword` dua tahap: validasi via Server Action, lalu locking session langsung melalui browser Supabase Client.

### 🔴 Masalah 3: Soal Ujian dengan Gambar Gagal Diunggah
- **Penyebab**: Bucket storage `question-images` di Supabase belum dibuat atau policy RLS-nya terbatas.
- **Solusi**: Pastikan bucket `question-images` berstatus **Public** dan memiliki policy `FOR ALL USING (true) WITH CHECK (true)` pada Supabase SQL Editor.

---

<p align="center">
  <sub>Dibuat dengan dedikasi untuk kesuksesan <strong>National Creativity Competition</strong>.</sub><br>
  <sub>© 2026 Tim Pengembang NCC. Hak cipta dilindungi.</sub>
</p>
