# 🏆 National Creativity Competition (NCC) — Dokumentasi Teknis Lengkap

> Platform kompetisi online full-stack berbasis **Next.js 16 + Supabase** dengan sistem CBT (Computer-Based Testing), manajemen peserta, jurasi, dan landing page interaktif.

**URL Produksi:** https://national-creativty-competition.vercel.app  
**Repository:** https://github.com/luthfi5372/National-Creativty-Competition  
**Database:** Supabase (PostgreSQL) — Project ID: `afwuyizfsoevcffnhfbk`

---

## 📋 Daftar Isi

1. [Arsitektur Sistem](#-arsitektur-sistem)
2. [Struktur Folder](#-struktur-folder)
3. [Database Schema](#-database-schema)
4. [Environment Variables](#-environment-variables)
5. [Cara Menjalankan Lokal](#-cara-menjalankan-lokal)
6. [Sistem Autentikasi](#-sistem-autentikasi)
7. [Halaman & Routing](#-halaman--routing)
8. [Komponen Landing Page](#-komponen-landing-page)
9. [Dashboard Peserta](#-dashboard-peserta)
10. [Admin HQ Panel](#-admin-hq-panel)
11. [Sistem CBT/Ujian](#-sistem-cbtujian)
12. [Panel Juri](#-panel-juri)
13. [Server Actions](#-server-actions)
14. [Cara Modifikasi Setiap Bagian](#-cara-modifikasi-setiap-bagian)

---

## 🏗 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                        │
│  Next.js App Router (React Server & Client Components)      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                   VERCEL (Edge/Serverless)                   │
│  middleware.ts → Route Guards (auth check per path)         │
│  Server Actions → Database mutations (auth.ts, etc.)        │
│  API Routes → /api/* endpoints                              │
└────────────────────────┬────────────────────────────────────┘
                         │ Supabase JS Client
┌────────────────────────▼────────────────────────────────────┐
│                 SUPABASE (Backend)                           │
│  Auth (JWT + Email confirmation)                            │
│  PostgreSQL (11 tabel utama)                                │
│  Storage (bukti bayar, avatar, gambar soal)                 │
│  Realtime (WebSocket untuk monitor CBT)                      │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | Tailwind CSS v4, Framer Motion, Lucide React |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Cookie-based session (`@supabase/ssr`) |
| State | React useState/useEffect (no Redux) |
| Animasi | GSAP, Framer Motion, Three.js (3D), Lenis (smooth scroll) |
| Grafik | Recharts, D3-geo (peta Indonesia) |
| QR Code | react-qr-code, html5-qrcode |
| PDF/Image | html-to-image (ID Card export) |
| Email | Resend |
| Deploy | Vercel |

---

## 📁 Struktur Folder

```
National-Creativty-Competition-main/
├── src/
│   ├── app/                          ← Semua halaman (App Router)
│   │   ├── page.tsx                  ← Landing Page utama
│   │   ├── layout.tsx                ← Root layout (font, metadata global)
│   │   ├── login/
│   │   │   ├── page.tsx              ← Halaman login (wrapper)
│   │   │   └── LoginForm.tsx         ← Form login (client component)
│   │   ├── register/
│   │   │   ├── page.tsx              ← Halaman daftar akun biasa
│   │   │   └── RegisterForm.tsx      ← Form daftar biasa
│   │   ├── daftar/
│   │   │   └── page.tsx              ← Halaman daftar via NPSN (peserta)
│   │   ├── dashboard/
│   │   │   └── page.tsx              ← Dashboard peserta (protected)
│   │   ├── hq/                       ← Admin Panel (protected: admin only)
│   │   │   ├── page.tsx              ← HQ utama (manajemen peserta)
│   │   │   ├── settings/page.tsx     ← Pengaturan website
│   │   │   ├── participants/page.tsx ← Daftar peserta detail
│   │   │   └── llms/                 ← Sistem CBT/Ujian Admin
│   │   │       ├── page.tsx          ← Manajemen sesi ujian
│   │   │       ├── broadcast/page.tsx← Broadcast pesan ke peserta
│   │   │       └── [exam_id]/
│   │   │           ├── questions/page.tsx  ← Input soal ujian
│   │   │           ├── monitor/page.tsx    ← Monitor ujian live
│   │   │           └── leaderboard/page.tsx← Papan skor
│   │   ├── ujian/                    ← Area ujian peserta (protected)
│   │   │   ├── page.tsx              ← Landing ujian
│   │   │   ├── login/page.tsx        ← Login khusus ujian
│   │   │   ├── dashboard/page.tsx    ← Dashboard sebelum ujian
│   │   │   └── [exam_id]/page.tsx    ← Ruang ujian aktif
│   │   ├── juri/                     ← Panel juri (protected)
│   │   │   ├── page.tsx              ← Daftar submission untuk dinilai
│   │   │   └── eval/[id]/page.tsx    ← Form penilaian submission
│   │   ├── leaderboard/page.tsx      ← Leaderboard publik
│   │   └── actions/
│   │       └── auth.ts               ← Semua Server Actions (auth, data)
│   │
│   ├── components/                   ← Komponen yang dapat digunakan ulang
│   │   ├── Navbar.tsx                ← Navigasi atas
│   │   ├── Footer.tsx                ← Footer
│   │   ├── HeroSection.tsx           ← Hero banner landing page
│   │   ├── TimelineSection.tsx       ← Timeline acara
│   │   ├── CategoryCards.tsx         ← Kartu kategori kompetisi
│   │   ├── FAQSection.tsx            ← FAQ
│   │   ├── SponsorsSection.tsx       ← Logo sponsor
│   │   ├── IndonesiaMap.tsx          ← Peta sebaran peserta
│   │   ├── HomeClient.tsx            ← Client wrapper landing page
│   │   ├── dashboard/                ← Komponen dashboard peserta
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── StatusCards.tsx
│   │   │   ├── AnnouncementBoard.tsx
│   │   │   ├── RegistrationModal.tsx
│   │   │   ├── SchoolHub.tsx
│   │   │   ├── IdCardModal.tsx
│   │   │   ├── TimelineWidget.tsx
│   │   │   └── WelcomeOverlay.tsx
│   │   ├── hq/                       ← Komponen panel admin
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── RingkasanTab.tsx
│   │   │   ├── ScoringTab.tsx
│   │   │   ├── UserRegistryTab.tsx
│   │   │   └── VerificationTab.tsx
│   │   ├── admin/
│   │   │   └── HomepageCMS.tsx       ← CMS untuk edit landing page
│   │   ├── auth/
│   │   │   ├── LoginFormClient.tsx
│   │   │   └── SessionManager.tsx
│   │   └── exam/
│   │       └── CheatRadar.tsx        ← Sistem deteksi kecurangan ujian
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             ← Supabase browser client
│   │   │   ├── server.ts             ← Supabase server client (SSR)
│   │   │   ├── service.ts            ← Supabase service role client
│   │   │   ├── index.ts              ← Re-export
│   │   │   └── cbt-service.ts        ← Fungsi-fungsi CBT
│   │   ├── localAuth.ts              ← Legacy auth helper (localStorage)
│   │   └── utils.ts                  ← Utility functions
│   │
│   ├── hooks/
│   │   ├── useLiveStats.ts           ← Hook polling statistik peserta
│   │   ├── useAdvancedProctoring.ts  ← Hook monitoring kecurangan ujian
│   │   └── useMagnetic.ts            ← Hook efek magnet UI
│   │
│   ├── types/
│   │   └── announcement.ts           ← TypeScript types untuk pengumuman
│   │
│   ├── contexts/
│   │   └── FluidContext.tsx          ← Context untuk efek fluid background
│   │
│   └── middleware.ts                 ← Route guard (auth per path)
│
├── public/                           ← Aset statis
├── .env.local                        ← Environment variables lokal
├── next.config.ts                    ← Konfigurasi Next.js
├── tailwind.config.ts                ← Konfigurasi Tailwind
└── package.json
```

---

## 🗄 Database Schema

Semua tabel berada di Supabase PostgreSQL dengan Row Level Security (RLS) aktif.

### Tabel `profiles`
Menyimpan data profil user yang terdaftar di Supabase Auth.

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  username    TEXT,
  full_name   TEXT,
  school      TEXT,
  npsn        VARCHAR(50),   -- Bisa alphanumeric, maks 50 karakter
  email       TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel `competition_entries`
Data pendaftaran kompetisi utama.

```sql
CREATE TABLE competition_entries (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name        TEXT,
  email            TEXT,
  whatsapp         TEXT,
  school_name      TEXT,
  npsn             VARCHAR(50),
  nisn             TEXT,
  province         TEXT,
  city             TEXT,
  competition_type TEXT,   -- 'Olimpiade MIPA', 'Speech Contest', dll.
  team_name        TEXT,
  mentor_name      TEXT,
  payment_status   TEXT DEFAULT 'Wait',  -- 'Wait'|'Verified'|'Paid'|'Rejected'
  payment_proof_url TEXT,
  submission_url   TEXT,
  submission_status TEXT,
  notes            JSONB,  -- Menyimpan custom_password dan data tambahan
  user_id          UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**Kolom `notes` (JSONB)** menyimpan:
```json
{
  "custom_password": "passworduser123",
  "payment_info": "...",
  "admin_notes": "..."
}
```

### Tabel `cbt_exams`
Sesi ujian CBT yang dibuat admin.

```sql
CREATE TABLE cbt_exams (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT NOT NULL,
  token            TEXT,              -- Token masuk ujian (opsional)
  duration_minutes INTEGER DEFAULT 90,
  is_active        BOOLEAN DEFAULT FALSE,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  scoring_system   TEXT DEFAULT 'Custom',  -- 'Fixed'|'Custom'|'Penalty'
  correct_point    NUMERIC DEFAULT 1,
  penalty_point    NUMERIC DEFAULT 0,
  empty_point      NUMERIC DEFAULT 0,
  description      TEXT,
  question_count   INTEGER,           -- Jumlah soal yang ditampilkan (NULL = semua)
  subject_config   JSONB,             -- Konfigurasi per mata pelajaran
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**Kolom `subject_config` (JSONB)** contoh:
```json
[
  { "name": "Matematika", "count": 20 },
  { "name": "Fisika", "count": 15 },
  { "name": "Kimia", "count": 15 }
]
```

### Tabel `cbt_questions`
Bank soal untuk tiap sesi ujian.

```sql
CREATE TABLE cbt_questions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id        UUID REFERENCES cbt_exams(id) ON DELETE CASCADE,
  question_text  TEXT,
  image_url      TEXT,           -- URL gambar soal (Supabase Storage)
  options        JSONB,          -- Array pilihan jawaban
  correct_answer TEXT,
  difficulty     TEXT DEFAULT 'Sedang',  -- 'Mudah'|'Sedang'|'Sulit'
  weight         NUMERIC DEFAULT 1,
  subject        TEXT,           -- Nama mata pelajaran (untuk subject_config)
  status         TEXT DEFAULT 'Published',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

**Kolom `options` (JSONB)** untuk soal pilihan ganda:
```json
["Jawaban A", "Jawaban B", "Jawaban C", "Jawaban D"]
```

### Tabel `cbt_attempts`
Data pengerjaan ujian per peserta.

```sql
CREATE TABLE cbt_attempts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id),
  exam_id          UUID REFERENCES cbt_exams(id),
  answers          JSONB,          -- { "question_id": "jawaban", ... }
  score            NUMERIC,
  started_at       TIMESTAMPTZ,   -- Kapan mulai mengerjakan
  submitted_at     TIMESTAMPTZ,   -- Kapan submit
  status           TEXT DEFAULT 'in_progress',  -- 'in_progress'|'submitted'
  violations_count INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel `announcements`
Pengumuman yang muncul di dashboard peserta.

```sql
CREATE TABLE announcements (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT,
  type       TEXT DEFAULT 'Info',  -- 'Info'|'Warning'|'Urgent'|'Event'
  target     TEXT DEFAULT 'all',   -- 'all' atau email spesifik
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel `site_settings`
Pengaturan website yang bisa diubah admin.

```sql
CREATE TABLE site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

Contoh data:
| key | value |
|-----|-------|
| `registration_open` | `true` |
| `maintenance_mode` | `false` |
| `hero_title` | `National Creativity Competition` |
| `hero_subtitle` | `Kompetisi nasional untuk...` |

### Tabel `school_messages`
Pesan dari sekolah ke panitia.

```sql
CREATE TABLE school_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT,
  npsn        VARCHAR(50),
  message     TEXT,
  sender_email TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel `jury_scores`
Nilai yang diberikan juri terhadap submission.

```sql
CREATE TABLE jury_scores (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id     UUID REFERENCES competition_entries(id),
  jury_email   TEXT,
  scores       JSONB,    -- { "kreativitas": 85, "presentasi": 90, ... }
  total_score  NUMERIC,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel `homepage_descriptions`
Konten teks dinamis untuk landing page (dikelola via CMS admin).

```sql
CREATE TABLE homepage_descriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section    TEXT UNIQUE,   -- 'hero', 'about', 'timeline', dll.
  content    TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Environment Variables

File `.env.local` (lokal) dan Vercel Environment Variables (produksi):

```env
# ── Supabase (WAJIB) ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://afwuyizfsoevcffnhfbk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Email (opsional, untuk fitur kirim email) ────────────────
RESEND_API_KEY=re_xxxxxxxxxxxx
```

> ⚠️ **PENTING:** `SUPABASE_SERVICE_ROLE_KEY` harus diset di Vercel agar fitur auto-confirm email, self-healing login, dan cascading delete peserta berfungsi di production.

**Cara set di Vercel:**
1. Dashboard Vercel → Project → **Settings** → **Environment Variables**
2. Tambahkan tiap variable di atas
3. Klik **Save** lalu **Redeploy**

---

## 🚀 Cara Menjalankan Lokal

```bash
# 1. Clone repo
git clone https://github.com/luthfi5372/National-Creativty-Competition.git
cd National-Creativty-Competition

# 2. Install dependencies
npm install

# 3. Buat file .env.local (isi dengan nilai dari Supabase dashboard)
cp .env.example .env.local
# Edit .env.local sesuai credentials Supabase kamu

# 4. Jalankan development server
npm run dev
# → Buka http://localhost:3000

# 5. Build untuk production
npm run build
npm start
```

---

## 🔑 Sistem Autentikasi

Sistem auth menggunakan **Supabase Auth** dengan dua lapisan:

### Alur Login (`/login`)

```
User input email + password
        ↓
[Server Action: loginLocalUser]
  1. Cek admin bypass (hardcoded email + password)
  2. supabase.auth.signInWithPassword() di server
  3. Jika gagal "Email not confirmed" → auto-confirm via admin API
  4. Jika gagal password → self-healing dari competition_entries.notes
  5. Return { success, isAdmin, resolvedEmail }
        ↓
[Client: LoginForm.tsx]
  6. supabase.auth.signInWithPassword() di BROWSER ← KUNCI UTAMA
     (agar session token tersimpan di browser cookies)
  7. Redirect ke /dashboard atau /hq
```

### Alur Daftar via NPSN (`/daftar`)

```
User isi form (NPSN auto-lookup sekolah)
        ↓
supabase.auth.signUp() dari browser (client-side)
        ↓
[Server Action: syncEntryOnDaftar]
  1. Auto-confirm email via admin API
  2. Buat profil di tabel profiles
  3. Link user_id ke competition_entries
  4. Simpan custom_password ke notes JSONB
        ↓
Redirect ke /login
```

### Admin / Email Khusus

Daftar email admin diset di **3 tempat**:

| File | Variabel | Tujuan |
|------|----------|--------|
| `src/middleware.ts` | `ADMIN_EMAILS` | Routing guard |
| `src/app/actions/auth.ts` | `adminEmails` | Login bypass |
| `src/app/juri/page.tsx` | `JURI_EMAILS` | Akses panel juri |

**Untuk menambah email admin baru**, edit ketiga file tersebut:

```typescript
// src/middleware.ts (baris ~5)
const ADMIN_EMAILS = ["admin@ncc.id", "admin1@ncc.id", "halo.ncc@gmail.com", "emailbaru@domain.com"];

// src/app/actions/auth.ts (baris ~220)
const adminEmails = ["admin@ncc.id", "admin1@ncc.id", "halo.ncc@gmail.com", "emailbaru@domain.com"];

// src/app/juri/page.tsx (baris ~10)
const JURI_EMAILS = ["juri1@ncc.id", "jurибaru@domain.com"];
```

---

## 📄 Halaman & Routing

### Peta URL Lengkap

| URL | File | Akses | Keterangan |
|-----|------|--------|------------|
| `/` | `src/app/page.tsx` | Publik | Landing page |
| `/login` | `src/app/login/page.tsx` | Publik | Form login |
| `/register` | `src/app/register/page.tsx` | Publik | Daftar akun biasa |
| `/daftar` | `src/app/daftar/page.tsx` | Publik | Daftar via NPSN |
| `/dashboard` | `src/app/dashboard/page.tsx` | User login | Dashboard peserta |
| `/hq` | `src/app/hq/page.tsx` | Admin only | Panel admin utama |
| `/hq/settings` | `src/app/hq/settings/page.tsx` | Admin only | Pengaturan site |
| `/hq/participants` | `src/app/hq/participants/page.tsx` | Admin only | Detail peserta |
| `/hq/llms` | `src/app/hq/llms/page.tsx` | Admin only | Manajemen CBT |
| `/hq/llms/[id]/questions` | `.../questions/page.tsx` | Admin only | Input soal |
| `/hq/llms/[id]/monitor` | `.../monitor/page.tsx` | Admin only | Monitor ujian |
| `/hq/llms/[id]/leaderboard` | `.../leaderboard/page.tsx` | Admin only | Papan skor |
| `/ujian` | `src/app/ujian/page.tsx` | Publik | Pintu masuk ujian |
| `/ujian/login` | `src/app/ujian/login/page.tsx` | Publik | Login ujian |
| `/ujian/dashboard` | `src/app/ujian/dashboard/page.tsx` | User ujian | Dashboard ujian |
| `/ujian/[exam_id]` | `src/app/ujian/[exam_id]/page.tsx` | User ujian | Ruang ujian |
| `/juri` | `src/app/juri/page.tsx` | Admin/Juri | Panel juri |
| `/juri/eval/[id]` | `src/app/juri/eval/[id]/page.tsx` | Admin/Juri | Form penilaian |
| `/leaderboard` | `src/app/leaderboard/page.tsx` | Publik | Leaderboard |

### Middleware Route Guard

File: `src/middleware.ts`

```typescript
// Ubah path yang dilindungi di sini:
const isProtectedPath = pathname.startsWith('/dashboard') || 
                        pathname.startsWith('/hq') || 
                        pathname.startsWith('/admin') || 
                        pathname.startsWith('/juri');
```

---

## 🌐 Komponen Landing Page

Landing page terdiri dari beberapa section yang disusun di `src/components/HomeClient.tsx`:

### Urutan Section

```tsx
// src/components/HomeClient.tsx
<Navbar />
<HeroSection />          // Banner utama + CTA
<TimelineSection />      // Timeline acara
<CategoryCards />        // Kartu kategori kompetisi
<IndonesiaMap />         // Peta sebaran peserta
<FeatureGrid />          // Fitur-fitur unggulan
<SponsorsSection />      // Logo sponsor
<FAQSection />           // FAQ
<Footer />
```

### 1. HeroSection — `src/components/HeroSection.tsx`

**Cara ubah teks hero:**
```tsx
// Cari dan ubah teks ini di HeroSection.tsx:
<h1>National Creativity Competition</h1>
<p>Teks subtitle di sini...</p>

// Atau lewat database (CMS) — table: homepage_descriptions
// key: 'hero_title', 'hero_subtitle'
```

**Cara ubah warna/gradient background hero:**
```tsx
// Cari className yang mengandung gradient, contoh:
className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-900"
// Ganti dengan warna yang diinginkan menggunakan Tailwind CSS classes
```

### 2. TimelineSection — `src/components/TimelineSection.tsx`

**Cara ubah data timeline:**
```tsx
// Cari array timelineData di dalam file ini, contoh:
const timelineData = [
  {
    date: "1 April 2026",
    title: "Pendaftaran Dibuka",
    description: "Gelombang 1 pendaftaran resmi dibuka",
    icon: "registration"
  },
  // Tambah/ubah entri di sini
];
```

### 3. CategoryCards — `src/components/CategoryCards.tsx`

**Cara ubah kategori kompetisi:**
```tsx
// Cari array categories:
const categories = [
  {
    name: "Olimpiade MIPA",
    description: "...",
    icon: "...",
    color: "indigo",
    price: "Rp 150.000"
  },
  // Tambah/ubah kategori di sini
];
```

> ⚠️ **Penting:** Nama kategori di sini harus **sinkron** dengan dropdown di `RegistrationModal.tsx` dan kolom `competition_type` di database.

### 4. Navbar — `src/components/Navbar.tsx`

**Cara ubah menu navigasi:**
```tsx
// Cari array navLinks atau navItems:
const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/#timeline", label: "Timeline" },
  { href: "/#kategori", label: "Kategori" },
  // Tambah link baru di sini
];
```

### 5. SponsorsSection — `src/components/SponsorsSection.tsx`

**Cara tambah/ubah logo sponsor:**
```tsx
const sponsors = [
  { name: "Sponsor A", logo: "/images/sponsor-a.png", url: "https://..." },
  { name: "Sponsor B", logo: "/images/sponsor-b.png", url: "https://..." },
];
// Taruh file logo di folder /public/images/
```

### 6. FAQSection — `src/components/FAQSection.tsx`

**Cara ubah FAQ:**
```tsx
const faqs = [
  {
    question: "Siapa yang bisa mendaftar?",
    answer: "Pelajar SMA/sederajat seluruh Indonesia..."
  },
  // Tambah/ubah FAQ di sini
];
```

### 7. IndonesiaMap — `src/components/IndonesiaMap.tsx`

**Cara ubah tampilan peta:**
```tsx
// Tampilkan persentase atau jumlah peserta:
// Ubah di baris yang render tooltip/badge provinsi

// Warna peta berdasarkan kepadatan peserta (baris ~200-250):
const getColor = (count: number) => {
  if (count > 100) return '#4f46e5'; // indigo gelap = banyak peserta
  if (count > 50)  return '#818cf8'; // indigo muda
  // dst.
};
```

---

## 👤 Dashboard Peserta

File utama: `src/app/dashboard/page.tsx`

### Komponen-Komponen Dashboard

#### DashboardHeader — `src/components/dashboard/DashboardHeader.tsx`
Menampilkan nama user, sekolah, dan tombol logout.

**Cara ubah data yang ditampilkan:**
```tsx
// Data user diambil dari Supabase auth:
const { data: authData } = await supabase.auth.getUser();
// user.user_metadata.full_name → nama
// user.user_metadata.school → sekolah
```

#### StatusCards — `src/components/dashboard/StatusCards.tsx`
Menampilkan status pendaftaran, pembayaran, dan submission.

**Status pembayaran yang valid:**
```
'Wait'     → Menunggu verifikasi
'Verified' → Sudah diverifikasi admin
'Paid'     → Sudah membayar (self-claim)
'Rejected' → Ditolak admin
```

#### RegistrationModal — `src/components/dashboard/RegistrationModal.tsx`
Form pendaftaran kompetisi untuk peserta yang sudah login.

**Cara ubah kategori kompetisi di dropdown:**
```tsx
// Cari <select> atau dropdown yang berisi competition_type:
<option value="Olimpiade MIPA">Olimpiade MIPA</option>
<option value="Speech Contest">Speech Contest</option>
// Tambah/ubah opsi sesuai kebutuhan
// PERHATIAN: Harus sinkron dengan CategoryCards.tsx
```

**Cara ubah field form:**
```tsx
// Cari state formData di dashboard/page.tsx:
const [formData, setFormData] = useState({
  full_name: "",
  school_name: "",
  nisn: "",
  province: "",
  competition_type: "Olimpiade MIPA",
  mentor_name: "",
  // Tambah field baru di sini
});

// Lalu tambah <input> di RegistrationModal.tsx
// Dan tambah kolom ke tabel competition_entries di Supabase
```

#### IdCardModal — `src/components/dashboard/IdCardModal.tsx`
Generate kartu ID peserta yang bisa di-download sebagai gambar PNG.

**Cara ubah desain ID Card:**
```tsx
// Cari div dengan id="id-card-content" atau className yang berisi layout kartu
// Ubah warna, font, layout sesuai kebutuhan
// Export menggunakan html-to-image library
```

---

## 🛡 Admin HQ Panel

File utama: `src/app/hq/page.tsx` (sangat besar, ~7000+ baris)

### Fitur-Fitur HQ

1. **Manajemen Peserta** — tambah, edit, hapus, verifikasi pembayaran
2. **Export CSV** — download data peserta
3. **Scan QR Code** — verifikasi kehadiran via QR
4. **Statistik Real-time** — grafik, peta, counter peserta
5. **Manajemen Pengumuman** — kirim pengumuman ke peserta
6. **CMS Homepage** — edit konten landing page

### Cara Tambah Kolom Baru di Tabel Peserta

1. **Tambah kolom di Supabase:**
```sql
ALTER TABLE competition_entries ADD COLUMN nama_kolom TEXT;
```

2. **Tambah di form HQ (`hq/page.tsx`):**
```tsx
// Cari state newParticipant atau editParticipant:
const [newParticipant, setNewParticipant] = useState({
  // ... existing fields ...
  nama_kolom: "",  // ← tambah ini
});

// Tambah input di modal add/edit
```

3. **Tambah di insert/update query:**
```tsx
const insertData = {
  // ... existing fields ...
  nama_kolom: newParticipant.nama_kolom,
};
await supabase.from('competition_entries').insert([insertData]);
```

### Verifikasi Pembayaran

```tsx
// Di hq/page.tsx, fungsi handleVerifyPayment:
const handleVerifyPayment = async (entryId: string) => {
  await supabase
    .from('competition_entries')
    .update({ payment_status: 'Verified' })
    .eq('id', entryId);
};
```

**Status yang bisa digunakan:**
- `'Wait'` — default, menunggu
- `'Paid'` — peserta upload bukti bayar
- `'Verified'` — admin sudah verifikasi
- `'Rejected'` — ditolak

### Cara Hapus Peserta (Cascading Delete)

Sistem menggunakan PostgreSQL RPC function `delete_participant_completely`:

```sql
-- Fungsi ini harus ada di Supabase SQL Editor:
CREATE OR REPLACE FUNCTION delete_participant_completely(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM cbt_answers WHERE attempt_id IN (
    SELECT id FROM cbt_attempts WHERE user_id = target_user_id
  );
  DELETE FROM cbt_attempts WHERE user_id = target_user_id;
  DELETE FROM jury_scores WHERE entry_id IN (
    SELECT id FROM competition_entries WHERE user_id = target_user_id
  );
  DELETE FROM competition_entries WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;
  -- Hapus dari auth.users memerlukan service role key
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📝 Sistem CBT/Ujian

### Struktur Flow CBT

```
Admin: Buat Sesi Ujian (/hq/llms)
  ↓
Admin: Input Soal (/hq/llms/[exam_id]/questions)
  ↓
Admin: Aktifkan Sesi (toggle is_active = true)
  ↓
Peserta: Login Ujian (/ujian/login) → masuk dengan token (jika ada)
  ↓
Peserta: Dashboard Ujian (/ujian/dashboard) → lihat daftar ujian aktif
  ↓
Peserta: Kerjakan Ujian (/ujian/[exam_id])
  ↓
Admin: Monitor Real-time (/hq/llms/[exam_id]/monitor)
  ↓
Admin: Lihat Leaderboard (/hq/llms/[exam_id]/leaderboard)
```

### Cara Buat Sesi Ujian Baru

1. Login sebagai admin → `/hq/llms`
2. Klik tombol **"Buat Sesi Baru"**
3. Isi formulir:
   - **Judul:** nama ujian
   - **Token:** kode masuk (kosongkan jika tidak perlu)
   - **Durasi:** dalam menit
   - **Jumlah Soal:** berapa soal yang ditampilkan ke peserta (null = semua)
   - **Mata Pelajaran:** konfigurasi soal per mapel (opsional)
   - **Sistem Penilaian:** Fixed / Custom / Penalty
4. Klik **Simpan**

### Konfigurasi Sistem Penilaian

| Mode | Keterangan |
|------|-----------|
| `Fixed` | Semua soal bobot sama |
| `Custom` | Tiap soal bisa berbeda bobotnya |
| `Penalty` | Jawaban salah mengurangi poin |

```tsx
// Di ujian/[exam_id]/page.tsx, logika penilaian:
const calculateScore = (answers, questions, scoringSystem) => {
  if (scoringSystem === 'Penalty') {
    // benar: +correct_point, salah: -penalty_point, kosong: +empty_point
  } else {
    // benar: +correct_point, salah/kosong: 0
  }
};
```

### Input Soal via Form

File: `src/app/hq/llms/[exam_id]/questions/page.tsx`

**Tipe Soal yang Didukung:**
1. **Pilihan Ganda** — 4 opsi A/B/C/D
2. **Essay** — teks bebas
3. **Isian Singkat** — teks pendek

**Cara Upload Gambar untuk Soal:**
```tsx
// Gambar diupload ke Supabase Storage bucket 'question-images'
// URL disimpan di kolom image_url di tabel cbt_questions
const { data } = await supabase.storage
  .from('question-images')
  .upload(`${examId}/${filename}`, file);
```

**Format CSV untuk Import Soal Massal:**
```csv
question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty,subject
"Soal nomor 1","Pilihan A","Pilihan B","Pilihan C","Pilihan D","A","Mudah","Matematika"
```

### Logika Pengambilan Soal Acak

File: `src/app/ujian/[exam_id]/page.tsx`

```tsx
// Mode 1: subject_config aktif (soal per mapel)
if (subjectConfig.length > 0) {
  subjectConfig.forEach(({ name, count }) => {
    const pool = questions.filter(q => q.subject === name);
    const shuffled = fisherYatesShuffle(pool);
    picked.push(...shuffled.slice(0, count));
  });
}

// Mode 2: question_count global
else if (questionCount && questionCount < questions.length) {
  finalQuestions = shuffle(questions).slice(0, questionCount);
}

// Mode 3: semua soal
else {
  finalQuestions = shuffle(questions);
}
```

### Timer Ujian

Timer berbasis **waktu mulai** (`started_at`) bukan countdown sederhana:

```tsx
// Saat halaman direfresh, timer dihitung dari waktu mulai:
const elapsedSec = Math.floor((Date.now() - new Date(started_at).getTime()) / 1000);
const remaining = Math.max(0, totalDuration - elapsedSec);
setTimeLeft(remaining);
```

### Sistem Anti-Cheat (Proctoring)

File: `src/hooks/useAdvancedProctoring.ts` dan `src/components/exam/CheatRadar.tsx`

Pelanggaran yang terdeteksi:
- Tab switching / minimize window
- Copy-paste
- Klik kanan
- Fullscreen exit

```tsx
// Cara ubah jumlah pelanggaran maksimal sebelum auto-submit:
const MAX_VIOLATIONS = 3; // default 3, ubah sesuai kebutuhan
// Di ujian/[exam_id]/page.tsx, cari MAX_VIOLATIONS
```

---

## ⚖️ Panel Juri

File: `src/app/juri/page.tsx` dan `src/app/juri/eval/[id]/page.tsx`

### Cara Akses Panel Juri

1. Tambahkan email juri ke `JURI_EMAILS` di `src/app/juri/page.tsx`
2. Login dengan email juri di `/login`
3. Buka `/juri`

### Cara Ubah Kriteria Penilaian Juri

```tsx
// Di src/app/juri/eval/[id]/page.tsx, cari array scoringCriteria:
const scoringCriteria = [
  { key: "kreativitas", label: "Kreativitas", maxScore: 30 },
  { key: "inovasi",     label: "Inovasi",     maxScore: 25 },
  { key: "presentasi", label: "Presentasi",   maxScore: 25 },
  { key: "dampak",     label: "Dampak Sosial",maxScore: 20 },
];
// Ubah key, label, dan maxScore sesuai kebutuhan
// Total maxScore harus = 100 (atau sesuaikan perhitungan total)
```

### Cara Tambah Email Juri Baru

```typescript
// src/app/juri/page.tsx (baris ~10):
const JURI_EMAILS = [
  "juri1@ncc.id",
  "juri2@ncc.id", 
  "emailjuribaru@domain.com",  // ← tambah di sini
];

// src/app/juri/eval/[id]/page.tsx (baris ~10):
const JURI_EMAILS = [
  "juri1@ncc.id",
  "juri2@ncc.id",
  "emailjuribaru@domain.com",  // ← tambah di sini juga
];
```

---

## ⚙️ Server Actions

Semua server actions ada di `src/app/actions/auth.ts`.

### Daftar Fungsi Utama

| Fungsi | Parameter | Keterangan |
|--------|-----------|------------|
| `registerLocalUser(formData)` | FormData | Daftar akun baru + auto-confirm email |
| `syncEntryOnDaftar(email, userId, password, npsn?, school?)` | string... | Sinkronisasi data setelah daftar via /daftar |
| `loginLocalUser(formData)` | FormData | Login dengan auto-healing |
| `logoutLocalUser()` | - | Logout + hapus cookies |
| `getLocalSession()` | - | Ambil data user yang sedang login |
| `getAdminCompetitionEntries()` | - | Ambil semua data peserta (bypass RLS) |

### Cara Tambah Server Action Baru

```typescript
// Di src/app/actions/auth.ts:
"use server";

export async function namaFungsiBaru(param: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  
  // Kode yang dijalankan di server
  const { error } = await supabase
    .from('nama_tabel')
    .update({ kolom: param })
    .eq('id', 'some-id');
    
  return { success: !error };
}
```

Panggil dari client component:
```tsx
"use client";
import { namaFungsiBaru } from "@/app/actions/auth";

// Di dalam event handler:
const result = await namaFungsiBaru("nilai-param");
```

---

## 🔧 Cara Modifikasi Setiap Bagian

### 1. Ubah Warna Tema Utama

Warna utama menggunakan **Tailwind CSS v4**. Cari dan replace:

```bash
# Warna indigo (utama) → ganti dengan warna lain:
# Contoh: ganti indigo ke violet

# Cari semua file dengan:
grep -r "indigo" src/ --include="*.tsx" -l

# Ganti secara manual atau:
# Tailwind config di tailwind.config.ts (jika ada custom colors)
```

### 2. Ubah Metadata/SEO

```tsx
// src/app/layout.tsx
export const metadata: Metadata = {
  title: "National Creativity Competition",        // ← Ubah judul
  description: "Platform kompetisi nasional...",   // ← Ubah deskripsi
  openGraph: {
    title: "NCC 2026",
    description: "...",
    images: ["/og-image.png"],                     // ← Taruh gambar di /public/
  },
};
```

### 3. Ubah Logo/Brand

```tsx
// src/components/Navbar.tsx
// Cari bagian logo:
<Image src="/logo.png" alt="NCC Logo" width={40} height={40} />
// Ganti /logo.png dengan file logo baru di /public/
```

### 4. Tambah Halaman Baru

```bash
# Buat file baru di src/app/nama-halaman/page.tsx
# Next.js App Router otomatis membuat route /nama-halaman
```

```tsx
// src/app/nama-halaman/page.tsx
export default function NamaHalaman() {
  return (
    <div>
      <h1>Halaman Baru</h1>
    </div>
  );
}
```

**Jika halaman butuh login, tambah guard di middleware:**
```typescript
// src/middleware.ts
const isProtectedPath = pathname.startsWith('/dashboard') || 
                        pathname.startsWith('/nama-halaman');  // ← tambah ini
```

### 5. Ubah Konten Pengumuman

**Via database (recommended):**
```sql
-- Di Supabase SQL Editor:
INSERT INTO announcements (title, content, type, target)
VALUES ('Judul Pengumuman', 'Isi pengumuman...', 'Info', 'all');

-- Target bisa: 'all' atau email spesifik: 'user@email.com'
-- Type: 'Info' | 'Warning' | 'Urgent' | 'Event'
```

**Via admin panel:**
1. Login sebagai admin → `/hq`
2. Tab **Pengumuman** → klik **Kirim Pengumuman Baru**

### 6. Ubah Harga/Biaya Pendaftaran

```tsx
// src/components/CategoryCards.tsx
const categories = [
  {
    name: "Olimpiade MIPA",
    price: "Rp 150.000",   // ← Ubah harga di sini
    // ...
  },
];

// Juga cek:
// src/lib/localAuth.ts → fungsi getCategoryPrice()
// src/components/dashboard/RegistrationModal.tsx → tampilan harga
```

### 7. Ubah Batas Waktu Pendaftaran

```tsx
// src/components/HeroSection.tsx atau TimelineSection.tsx
// Cari countdown timer atau tanggal deadline:
const deadline = new Date("2026-12-31T23:59:59");  // ← Ubah tanggal ini
```

### 8. Tambah Field Baru di Form Pendaftaran

**Langkah lengkap:**

```sql
-- Step 1: Tambah kolom di Supabase
ALTER TABLE competition_entries ADD COLUMN field_baru TEXT;
```

```tsx
// Step 2: Tambah di state formData (dashboard/page.tsx):
const [formData, setFormData] = useState({
  // ... existing fields ...
  field_baru: "",  // ← tambah ini
});

// Step 3: Tambah input di RegistrationModal.tsx:
<input
  type="text"
  value={formData.field_baru}
  onChange={e => setFormData({...formData, field_baru: e.target.value})}
  placeholder="Isi field baru"
/>

// Step 4: Sertakan saat submit:
const { error } = await supabase.from('competition_entries').insert([{
  // ... existing fields ...
  field_baru: formData.field_baru,
}]);

// Step 5: Tampilkan di HQ panel (hq/page.tsx) jika diperlukan
```

### 9. Konfigurasi Storage Bucket

Storage Supabase digunakan untuk:
- `payment-proofs` — bukti pembayaran peserta
- `question-images` — gambar soal CBT  
- `submissions` — file submission karya
- `avatars` — foto profil

**Cara upload file ke storage:**
```tsx
const { data, error } = await supabase.storage
  .from('nama-bucket')           // ← nama bucket
  .upload(`folder/${filename}`, file, {
    cacheControl: '3600',
    upsert: true
  });

// Ambil URL publik:
const { data: { publicUrl } } = supabase.storage
  .from('nama-bucket')
  .getPublicUrl(`folder/${filename}`);
```

### 10. Ubah Sistem Realtime (Live Monitor CBT)

```tsx
// Di hq/llms/[exam_id]/monitor/page.tsx:
// Realtime subscription Supabase:
const subscription = supabase
  .channel('cbt-monitor')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'cbt_attempts', filter: `exam_id=eq.${examId}` },
    (payload) => {
      // Update UI saat ada perubahan data ujian
      handleRealtimeUpdate(payload);
    }
  )
  .subscribe();

// Jangan lupa cleanup:
return () => supabase.removeChannel(subscription);
```

---

## 📊 Hooks & Utilities

### `useLiveStats` — `src/hooks/useLiveStats.ts`

Polling otomatis statistik peserta setiap 60 detik.

```tsx
// Cara pakai:
import { useLiveStats } from "@/hooks/useLiveStats";

function MyComponent() {
  const { totalParticipants, byProvince, isLoading } = useLiveStats();
  
  return <div>Total: {totalParticipants}</div>;
}

// Cara ubah interval polling (default 60000ms = 60 detik):
// Di useLiveStats.ts, cari setInterval:
const interval = setInterval(fetchStats, 30000); // ← ubah ke 30 detik
```

### `useAdvancedProctoring` — `src/hooks/useAdvancedProctoring.ts`

Monitoring kecurangan selama ujian berlangsung.

```tsx
const { violationsCount, isWarning } = useAdvancedProctoring({
  examId: "uuid-exam",
  onViolation: (type) => {
    console.log("Pelanggaran:", type);
    // type: 'tab_switch' | 'copy_paste' | 'right_click' | 'fullscreen_exit'
  },
  maxViolations: 3, // auto-submit setelah 3 pelanggaran
});
```

---

## 🚀 Deploy ke Vercel

```bash
# 1. Push ke GitHub
git add -A
git commit -m "pesan commit"
git push origin main

# 2. Vercel otomatis deploy dari branch main
# Lihat progress di: https://vercel.com/dashboard
```

**Checklist sebelum deploy:**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` sudah diset di Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL` sudah diset di Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` sudah diset di Vercel
- [ ] RLS policies sudah aktif di semua tabel
- [ ] Storage buckets sudah dibuat (`payment-proofs`, `question-images`, `submissions`, `avatars`)

---

## 🐛 Troubleshooting

### User tidak bisa login setelah daftar
**Penyebab:** Email belum dikonfirmasi di Supabase  
**Solusi:** Sistem sudah handle otomatis via auto-confirm. Pastikan `SUPABASE_SERVICE_ROLE_KEY` diset di Vercel.

### Data peserta tidak muncul di HQ
**Penyebab:** RLS Policy memblokir query  
**Solusi:** Pastikan semua tabel punya policy `FOR ALL USING (true)` atau sesuaikan dengan kondisi autentikasi.

### Upload gambar soal gagal
**Penyebab:** Storage bucket `question-images` belum ada atau policy storage belum dibuat  
**Solusi:**
```sql
-- Di Supabase SQL Editor:
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

-- Policy storage:
CREATE POLICY "Allow all" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
```

### Build gagal di Vercel (Google Fonts error)
**Penyebab:** Google Fonts tidak bisa diakses saat build  
**Solusi:** Ini sudah dihandle Next.js — tidak mempengaruhi fungsionalitas. Hanya warning.

---

## 📞 Kontak & Kontribusi

- **Admin Email:** admin@ncc.id
- **Repository:** https://github.com/luthfi5372/National-Creativty-Competition

Untuk kontribusi atau pertanyaan teknis, buka Issue di GitHub repository.

---

*Dokumentasi ini dibuat otomatis berdasarkan analisis kode sumber. Terakhir diperbarui: Oktober 2026.*
