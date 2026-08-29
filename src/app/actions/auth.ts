"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// SERVER ACTIONS
// ============================================================

export type AuthResult = {
  success: boolean;
  error?: string;
  isAdmin?: boolean;
};

/** Mendaftarkan user baru ke Supabase Auth & Tabel Profiles */
export async function registerLocalUser(formData: FormData): Promise<AuthResult> {
  const username = formData.get("username")?.toString().trim();
  const fullName = formData.get("fullName")?.toString().trim();
  const school = formData.get("school")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!username || !fullName || !email || !password) {
    return { success: false, error: "Semua kolom wajib diisi." };
  }

  if (password.length < 6) {
    return { success: false, error: "Kata sandi minimal 6 karakter." };
  }

  try {
    const supabase = await createClient();

    // 1. Sign up to Supabase Auth — simpan school ke metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          full_name: fullName,
          school: school,        // ← disimpan agar SchoolHub bisa fallback ke sini
          custom_password: password,
        }
      }
    });

    if (authError) throw authError;

    // 2. Create profile in profiles table
    if (authData.user) {
      // Sync cookie so they can access dashboard immediately if logged in
      const cookieStore = await cookies();
      cookieStore.set("ncc_hint", "1", { path: "/", maxAge: 60 * 60 * 24 * 7 });

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username,
          full_name: fullName,
          school: school || null,  // ← simpan school ke profiles juga
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // Automatically link pre-existing competition_entries matching this email
      try {
        const { data: entries } = await supabase
          .from('competition_entries')
          .select('id, notes')
          .eq('email', email);
          
        if (entries && entries.length > 0) {
          for (const entry of entries) {
            let notesObj: any = {};
            if (entry.notes) {
              try { notesObj = JSON.parse(entry.notes); } catch (e) {}
            }
            notesObj.custom_password = password; // Save plain text custom password
            
            await supabase
              .from('competition_entries')
              .update({
                user_id: authData.user.id,
                notes: JSON.stringify(notesObj)
              })
              .eq('id', entry.id);
          }
        }
      } catch (err) {
        console.error("Gagal menautkan competition_entries pada registrasi:", err);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, error: error.message || "Terjadi kesalahan saat pendaftaran." };
  }
}

/** Sinkronisasi data pendaftaran dan sandi kustom dari form client-side /daftar */
export async function syncEntryOnDaftar(email: string, userId: string, password: string) {
  try {
    const supabase = await createClient();
    const { data: entries } = await supabase
      .from('competition_entries')
      .select('id, notes')
      .eq('email', email);
      
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        let notesObj: any = {};
        if (entry.notes) {
          try { notesObj = JSON.parse(entry.notes); } catch (e) {}
        }
        notesObj.custom_password = password; // Save plain text custom password
        
        await supabase
          .from('competition_entries')
          .update({
            user_id: userId,
            notes: JSON.stringify(notesObj)
          })
          .eq('id', entry.id);
      }
    }
    return { success: true };
  } catch (err) {
    console.error("Gagal sinkronisasi entry pada daftar client:", err);
    return { success: false };
  }
}

/** Login user menggunakan Supabase Auth */
export async function loginLocalUser(formData: FormData): Promise<AuthResult> {
  const loginInput = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!loginInput || !password) {
    return { success: false, error: "Email/Username dan kata sandi wajib diisi." };
  }

  // 🔥 TAKTIK 3: HARDCODE BYPASS KHUSUS ADMIN (STEALTH MODE)
  const adminEmails = ["admin@ncc.id", "admin1@ncc.id", "halo.ncc@gmail.com"];
  const isAdminBypass = 
    (loginInput === 'admin1@ncc.id' && password === '123456') ||
    (loginInput === 'admin' && password === 'admin123') ||
    (loginInput === 'admin@ncc.id' && password === 'admin123') ||
    (loginInput === 'halo.ncc@gmail.com' && password === 'ncc2026');

  if (isAdminBypass) {
    const cookieStore = await cookies();
    cookieStore.set("ncc_hint", "1", { path: "/", maxAge: 604800, sameSite: "lax" });
    cookieStore.set("ncc_admin_hint", "1", { path: "/", maxAge: 604800, sameSite: "lax" });

    // 🚀 BRIDGE TO SUPABASE AUTH: Auto-register and login the admin to establish a valid Supabase Auth session
    // This allows the admin client to bypass the Row Level Security (RLS) policies and see the participant list.
    try {
      const supabase = await createClient();
      const authEmail = loginInput === "admin" ? "admin@ncc.id" : loginInput;
      const authPassword = password;

      console.log(`[Admin Bridge] Attempting to sign in admin to Supabase Auth: ${authEmail}...`);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      });

      if (signInError) {
        console.warn(`[Admin Bridge] Admin sign-in failed: ${signInError.message}. Attempting auto-registration...`);
        
        // Register the admin account on the fly
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: "NCC Admin Command",
              username: authEmail.split('@')[0],
            }
          }
        });

        if (!signUpError && signUpData.user) {
          console.log(`[Admin Bridge] Successfully registered admin on-the-fly. Syncing profile...`);
          // Sync profile to profiles table
          await supabase
            .from('profiles')
            .insert({
              id: signUpData.user.id,
              username: authEmail.split('@')[0],
              full_name: "NCC Admin Command",
            });

          // Log in again to establish session cookies
          await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword
          });
          console.log(`[Admin Bridge] Admin successfully logged in after auto-registration!`);
        } else {
          console.error(`[Admin Bridge] Auto-registration failed:`, signUpError);
        }
      } else {
        console.log(`[Admin Bridge] Admin logged in successfully!`);
      }
    } catch (e) {
      console.error(`[Admin Bridge] Error bridging admin bypass to Supabase Auth:`, e);
    }

    return { success: true, isAdmin: true };
  }


  try {
    const supabase = await createClient();
    let email = loginInput;

    // Resolusi Username ke Email
    if (!loginInput.includes('@')) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        return { success: false, error: "Konfigurasi server tidak valid (Service Role Key hilang)." };
      }
      
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // 1. Coba cari di profiles (Bypass RLS)
      const { data: profile } = await serviceClient.from('profiles').select('id').eq('username', loginInput).single();
      if (profile) {
        // 2. Coba cari email di competition_entries menggunakan user_id dari profiles (Bypass RLS)
        const { data: entry } = await serviceClient.from('competition_entries').select('email').eq('user_id', profile.id).single();
        if (entry && entry.email) {
          email = entry.email.toLowerCase();
          console.log(`[Auth] Resolved username '${loginInput}' to email '${email}' via user_id`);
        } else {
          // Fallback: cari di notes (barangkali disimpan di sana), atau kembalikan error
          return { success: false, error: "Username ditemukan tetapi email tidak terhubung. Gunakan email untuk login." };
        }
      } else {
        return { success: false, error: "Username tidak ditemukan." };
      }
    }

    let signInResult = null;
    try {
      signInResult = await supabase.auth.signInWithPassword({
        email,
        password
      });
    } catch (e: any) {
      signInResult = { data: null, error: e };
    }

    let authData = signInResult.data;
    let authError = signInResult.error;

    if (authError) {
      // 🚨 FALLBACK: Check if this user exists in competition_entries and has verified status
      // where email = email and password (entered as password) matches their NISN
      const { data: entries, error: dbError } = await supabase
        .from('competition_entries')
        .select('*')
        .eq('email', email)
        .eq('nisn', password); // Password is their NISN!

      if (!dbError && entries && entries.length > 0) {
        const entry = entries[0];
        
        // If they already have a user_id linked in the database, they already have a Supabase Auth account.
        // If signInWithPassword failed, they entered a wrong password, so we do not re-register them.
        if (entry.user_id) {
          throw new Error("Email atau kata sandi salah. Jika Anda sudah mengaktifkan akun / membuat kata sandi kustom sebelumnya, silakan gunakan kata sandi kustom Anda (bukan NISN).");
        }

        console.log(`[Auth Fallback] Found matching verified participant for ${email}. Auto-registering...`);
        
        // Register the participant on-the-fly in Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password, // NISN becomes their password
          options: {
            data: {
              full_name: entry.full_name,
              username: email.split('@')[0],
              custom_password: password, // NISN becomes custom password!
            }
          }
        });

        if (!signUpError && signUpData.user) {
          // Sync profile to profiles table
          await supabase
            .from('profiles')
            .insert({
              id: signUpData.user.id,
              username: email.split('@')[0],
              full_name: entry.full_name,
            });

          // Link competition_entries user_id with the new Supabase Auth user ID
          await supabase
            .from('competition_entries')
            .update({ user_id: signUpData.user.id })
            .eq('id', entry.id);

          // Retry login
          const retryResult = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (!retryResult.error) {
            authData = retryResult.data;
            authError = null;
          } else {
            throw retryResult.error;
          }
        } else {
          const isAlreadyRegistered = 
            signUpError?.message?.toLowerCase().includes("already registered") || 
            signUpError?.message?.toLowerCase().includes("already exists") ||
            signUpError?.status === 422;

          if (isAlreadyRegistered) {
            throw new Error("Email ini sudah terdaftar dengan kata sandi kustom. Silakan masuk menggunakan kata sandi yang Anda buat saat pendaftaran pertama kali di portal ini (bukan NISN Anda), atau gunakan fitur Lupa Sandi.");
          }
          throw signUpError || new Error("Failed to register participant on-the-fly.");
        }
      } else {
        throw authError; // Throw original login error
      }
    }

    if (!authData || !authData.user) {
      throw new Error("Sesi tidak valid.");
    }

    const isAdmin = adminEmails.includes(authData.user.email?.toLowerCase() || "");

    // Set cookie for middleware sync
    const cookieStore = await cookies();
    cookieStore.set("ncc_hint", "1", { path: "/", maxAge: 60 * 60 * 24 * 7 });
    if (isAdmin) {
      cookieStore.set("ncc_admin_hint", "1", { path: "/", maxAge: 60 * 60 * 24 * 7 });
    }

    // 🚀 SELF-HEALING PASSWORD SYNC & LINKING:
    // Write the successful plain-text password to competition_entries.notes JSON and ensure user_id is linked.
    if (!isAdmin) {
      try {
        const { data: entries } = await supabase
          .from('competition_entries')
          .select('id, notes, user_id')
          .or(`user_id.eq.${authData.user.id},email.eq.${email}`);
          
        if (entries && entries.length > 0) {
          for (const entry of entries) {
            let notesObj: any = {};
            if (entry.notes) {
              try { notesObj = JSON.parse(entry.notes); } catch (e) {}
            }
            notesObj.custom_password = password; // Save plain text password
            
            const updatePayload: any = { notes: JSON.stringify(notesObj) };
            if (!entry.user_id) {
              updatePayload.user_id = authData.user.id; // Link user_id!
            }
            
            await supabase
              .from('competition_entries')
              .update(updatePayload)
              .eq('id', entry.id);
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi sandi/link ke competition_entries:", err);
      }
    }

    return { success: true, isAdmin };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, error: error.message || "Email atau kata sandi salah." };
  }
}

/** Logout user dari Supabase */
export async function logoutLocalUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Clear middleware hint cookie
  const cookieStore = await cookies();
  cookieStore.delete("ncc_hint");
  cookieStore.delete("ncc_admin_hint");
  
  redirect("/login");
}

/** Mendapatkan user yang sedang login dari Supabase Session */
export async function getLocalSession() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Fetch school from profile if needed, but for session basic info is enough
    return {
      id: user.id,
      email: user.email!,
      username: user.user_metadata.username || user.email?.split('@')[0],
      fullName: user.user_metadata.full_name || "Peserta NCC",
    };
  } catch {
    return null;
  }
}

/** Mengambil semua pendaftaran kompetisi khusus untuk halaman Admin HQ (Bypass RLS via Service Role) */
export async function getAdminCompetitionEntries() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // --- TAHAP 1: Gunakan Service Role Key (Bypass RLS 100%) ---
    if (serviceRoleKey) {
      console.log("[SA] Menggunakan Service Role Key...");
      const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data, error } = await serviceClient
        .from('competition_entries')
        .select('*')
        .neq('email', 'admin1@ncc.id')
        .order('created_at', { ascending: false })
        .range(0, 9999);

      console.log("[SA] Service Role hasil:", data?.length ?? 0, "baris, error:", error?.message);
      if (!error) return { data: data || [], error: null };
    }

    // --- TAHAP 2: Coba dengan sesi cookie server ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmails = ["admin@ncc.id", "admin1@ncc.id", "halo.ncc@gmail.com"];
    console.log("[SA] Sesi cookie:", user?.email || "tidak ada");

    if (user && adminEmails.includes(user.email?.toLowerCase() || "")) {
      const { data, error } = await supabase
        .from('competition_entries')
        .select('*')
        .neq('email', 'admin1@ncc.id')
        .order('created_at', { ascending: false })
        .range(0, 9999);
      console.log("[SA] Cookie sesi hasil:", data?.length ?? 0, "baris");
      if (!error && data && data.length > 0) return { data, error: null };
    }

    // --- TAHAP 3: Coba login admin1, atau daftarkan dulu jika belum ada ---
    const authClient = createSupabaseClient(supabaseUrl, anonKey);

    let signInResult = await authClient.auth.signInWithPassword({
      email: 'admin1@ncc.id',
      password: '123456',
    });

    // Jika gagal login → coba daftarkan akun admin1 dulu
    if (signInResult.error) {
      console.log("[SA] Login gagal, coba daftar akun admin1...", signInResult.error.message);
      await authClient.auth.signUp({
        email: 'admin1@ncc.id',
        password: '123456',
        options: { data: { full_name: 'Admin NCC', username: 'admin1' } }
      });
      // Coba login lagi setelah daftar
      signInResult = await authClient.auth.signInWithPassword({
        email: 'admin1@ncc.id',
        password: '123456',
      });
    }

    console.log("[SA] Login admin1:", signInResult.error ? `GAGAL - ${signInResult.error.message}` : "BERHASIL");

    if (!signInResult.error) {
      const { data, error } = await authClient
        .from('competition_entries')
        .select('*')
        .neq('email', 'admin1@ncc.id')
        .order('created_at', { ascending: false })
        .range(0, 9999);
      console.log("[SA] Login admin hasil:", data?.length ?? 0, "baris");
      if (!error) return { data: data || [], error: null };
    }

    // --- TAHAP 4: Last resort - query anonim (hanya berhasil jika RLS dinonaktifkan) ---
    const { data: anonData, error: anonError } = await authClient
      .from('competition_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 9999);
    console.log("[SA] Anon query hasil:", anonData?.length ?? 0, "baris, error:", anonError?.message);
    return { data: anonData || [], error: anonError?.message || null };

  } catch (err: any) {
    console.error("[Server Action] Exception:", err);
    return { data: null, error: err.message || "Gagal mengambil data." };
  }
}

/** Mengambil list user yang sudah register (di profiles / auth.users) tapi belum memilih lomba */
export async function getUnregisteredUsers() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.warn("[SA] getUnregisteredUsers: Missing SUPABASE_SERVICE_ROLE_KEY. Falling back to anon client.");
    }

    // Gunakan service role client jika tersedia agar 100% bypass RLS, jika tidak gunakan anon client
    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    // 1. Ambil semua entries dari competition_entries untuk disilang
    const { data: entries, error: entriesError } = await client
      .from('competition_entries')
      .select('user_id, email');

    if (entriesError) {
      console.error("[SA] Gagal mengambil competition_entries:", entriesError);
      return { data: [], error: entriesError.message };
    }

    const registeredUserIds = new Set<string>();
    const registeredEmails = new Set<string>();

    entries?.forEach(entry => {
      if (entry.user_id) registeredUserIds.add(entry.user_id);
      if (entry.email) registeredEmails.add(entry.email.toLowerCase().trim());
    });

    // 2. Ambil semua profiles
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error("[SA] Gagal mengambil profiles:", profilesError);
      return { data: [], error: profilesError.message };
    }

    // 3. Ambil data auth users dari admin list jika service role tersedia
    let authUsers: any[] = [];
    if (serviceRoleKey) {
      try {
        const { data: authData, error: authError } = await client.auth.admin.listUsers();
        if (!authError && authData?.users) {
          authUsers = authData.users;
        }
      } catch (err) {
        console.warn("[SA] Gagal melist auth users dari admin API:", err);
      }
    }

    const adminEmails = ["admin@ncc.id", "admin1@ncc.id", "halo.ncc@gmail.com"];
    const unregisteredMap = new Map<string, any>();

    // Masukkan data dari auth users terlebih dahulu
    authUsers.forEach(user => {
      const email = user.email?.toLowerCase().trim() || "";
      if (adminEmails.includes(email)) return; // Lewati admin

      const hasUserId = registeredUserIds.has(user.id);
      const hasEmail = registeredEmails.has(email);

      if (!hasUserId && !hasEmail) {
        unregisteredMap.set(user.id, {
          id: user.id,
          email: user.email || "",
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || "User Tanpa Nama",
          username: user.user_metadata?.username || "-",
          school: "-",
          phone: "-",
          createdAt: user.created_at || new Date().toISOString(),
          password: user.user_metadata?.custom_password || "-",
        });
      }
    });

    // Perkaya atau tambahkan data dari tabel profiles
    profiles?.forEach(profile => {
      const hasUserId = registeredUserIds.has(profile.id);
      const emailFromMeta = (profile as any).email || "";
      const hasEmail = emailFromMeta ? registeredEmails.has(emailFromMeta.toLowerCase().trim()) : false;

      if (!hasUserId && !hasEmail) {
        const existing = unregisteredMap.get(profile.id);
        if (existing) {
          // Update data yang ada dengan data profile yang lebih lengkap
          unregisteredMap.set(profile.id, {
            ...existing,
            fullName: profile.full_name || existing.fullName,
            username: profile.username || existing.username,
            school: (profile as any).school || existing.school,
            phone: (profile as any).phone || existing.phone,
            createdAt: (profile as any).created_at || existing.createdAt,
          });
        } else {
          // check email jika profiles ada email atau coba cari di authUsers jika ada
          const matchingAuth = authUsers.find(u => u.id === profile.id);
          const email = matchingAuth?.email || (profile as any).email || "";
          
          if (email && adminEmails.includes(email.toLowerCase().trim())) return; // Lewati admin
          if (email && registeredEmails.has(email.toLowerCase().trim())) return; // Lewati jika email sudah mendaftar

          unregisteredMap.set(profile.id, {
            id: profile.id,
            email: email,
            fullName: profile.full_name || "User Tanpa Nama",
            username: profile.username || "-",
            school: (profile as any).school || "-",
            phone: (profile as any).phone || "-",
            createdAt: (profile as any).created_at || new Date().toISOString(),
            password: matchingAuth?.user_metadata?.custom_password || "-",
          });
        }
      }
    });

    // Ubah ke array dan urutkan berdasarkan waktu registrasi terbaru
    const result = Array.from(unregisteredMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { data: result, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception getUnregisteredUsers:", err);
    return { data: [], error: err.message || "Gagal mengambil data." };
  }
}

/** Mengambil data telemetri CBT/LLMS secara aman dari server (RLS bypass) */
export async function getLLMSTelemetryData() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Gunakan service role jika ada, fallback ke anon client
    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    // Ambil data cbt_questions dengan select exam_id untuk menghitung jumlah soal per sesi
    const { data: questionsData, error: qError } = await client
      .from('cbt_questions')
      .select('exam_id');

    if (qError) {
      console.warn("[LLMS Telemetry] cbt_questions query failed:", qError.message);
    }

    const questionCount = questionsData?.length || 0;

    // Kelompokkan jumlah soal berdasarkan exam_id
    const questionCounts: Record<string, number> = {};
    if (questionsData) {
      questionsData.forEach((q: any) => {
        if (q.exam_id) {
          questionCounts[q.exam_id] = (questionCounts[q.exam_id] || 0) + 1;
        }
      });
    }

    // Ambil data cbt_exams
    const { data: examsData, error: eError } = await client
      .from('cbt_exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (eError) {
      console.warn("[LLMS Telemetry] cbt_exams query failed:", eError.message);
    }

    // Petakan properti total_questions (jumlah di bank) dan pertahankan question_count (target tampil)
    const examsWithCounts = (examsData || []).map((exam: any) => ({
      ...exam,
      total_questions: questionCounts[exam.id] || 0,
      question_count: exam.question_count ?? null
    }));

    // Ambil data cbt_attempts
    const { data: attemptsData, error: aError } = await client
      .from('cbt_attempts')
      .select('warnings_count, violations_count, submitted_at, user_id, updated_at')
      .order('updated_at', { ascending: false });

    const errorMsg = [
      qError && `Questions: ${qError.message}`,
      eError && `Exams: ${eError.message}`,
      aError && `Attempts: ${aError.message}`
    ].filter(Boolean).join(" | ");

    return {
      questionCount: questionCount,
      examsData: examsWithCounts,
      attemptsData: attemptsData || [],
      error: errorMsg || null
    };
  } catch (err: any) {
    console.error("[Server Action] Exception getLLMSTelemetryData:", err);
    return {
      questionCount: 0,
      examsData: [],
      attemptsData: [],
      error: err.message || "Gagal mengambil data telemetri."
    };
  }
}

/** Mengambil data siaran (announcements) secara aman dari server (RLS bypass) */
export async function getAdminBroadcasts() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data, error } = await client
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const SYSTEM_TITLE_PREFIXES = ['SYS_', 'SYSTEM_'];
    const SYSTEM_TITLES_EXACT = [
      'SYS_PORTAL_SETTINGS', 'SYSTEM_TIMELINE_CONFIG', 'SYS_TOKEN_SETTINGS',
      'SYS_COMMUNITY_GROUPS', 'SYS_PAYMENT_CONFIG',
    ];

    const cleaned = (data || [])
      .filter((item: any) => {
        const title = String(item.title || '');
        if (SYSTEM_TITLES_EXACT.includes(title)) return false;
        if (SYSTEM_TITLE_PREFIXES.some(p => title.startsWith(p))) return false;
        if (item.type === 'system') return false;
        return true;
      })
      .map((item: any) => {
        let msg = item.message || '';
        if (!msg && item.content) {
          try {
            const parsed = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            msg = parsed?.message || (typeof item.content === 'string' ? item.content : '');
          } catch (e) {
            msg = String(item.content || '');
          }
        }
        return {
          ...item,
          message: msg
        };
      });

    return { data: cleaned, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception getAdminBroadcasts:", err);
    return { data: [], error: err.message || "Gagal mengambil siaran." };
  }
}

/** Mengirim siaran komando secara aman (Bypass RLS via Service Role) */
export async function postAdminBroadcast(payload: {
  title: string;
  message: string;
  target_audience: string;
  target_user_ids?: string[];
  type?: string;
}) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const rawTargets = payload.target_audience === 'specific' ? (payload.target_user_ids || []) : [];
    const cleanTargets = Array.from(new Set(
      rawTargets.map((t: any) => String(t || '').trim()).filter((t: string) => t.length > 0)
    ));

    const contentPayload = JSON.stringify({
      message: payload.message,
      target_user_ids: cleanTargets
    });

    // Catatan: kolom 'message' tidak ada di tabel announcements, teks disimpan di kolom 'content'
    const { data, error } = await client
      .from('announcements')
      .insert([
        {
          title: payload.title,
          content: contentPayload,
          type: payload.type || 'broadcast',
          target_audience: payload.target_audience
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { 
      data: {
        ...data,
        message: payload.message
      }, 
      error: null 
    };
  } catch (err: any) {
    console.error("[Server Action] Exception postAdminBroadcast:", err);
    return { data: null, error: err.message || "Gagal menyiarkan pesan." };
  }
}

/** Menghapus siaran komando secara aman (Bypass RLS via Service Role) */
export async function deleteAdminBroadcast(id: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { error } = await client
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception deleteAdminBroadcast:", err);
    return { success: false, error: err.message || "Gagal menghapus siaran." };
  }
}

/** Mengambil data pengumuman untuk peserta secara aman (RLS bypass) dan sesuai target */
export async function getParticipantBroadcasts(
  userId: string, 
  userStatus: string = 'Pending',
  entryId?: string,
  userEmail?: string
) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data: rawData, error } = await client
      .from('announcements')
      .select('*')
      .neq('title', 'SYS_PORTAL_SETTINGS')
      .neq('title', 'SYSTEM_TIMELINE_CONFIG')
      .neq('title', 'SYS_TOKEN_SETTINGS')
      .neq('title', 'SYS_COMMUNITY_GROUPS')
      .neq('title', 'SYS_PAYMENT_CONFIG')
      .not('title', 'like', 'SYS_%')
      .not('title', 'like', 'SYSTEM_%')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 🔒 Filter keamanan: buang SEMUA entry sistem dari hasil DB
    const SYSTEM_TITLE_PREFIXES = ['SYS_', 'SYSTEM_'];
    const SYSTEM_TITLES_EXACT = [
      'SYS_PORTAL_SETTINGS', 'SYSTEM_TIMELINE_CONFIG', 'SYS_TOKEN_SETTINGS',
      'SYS_COMMUNITY_GROUPS', 'SYS_PAYMENT_CONFIG',
    ];
    const nonSystemData = (rawData || []).filter((item: any) => {
      const title = String(item.title || '');
      if (SYSTEM_TITLES_EXACT.includes(title)) return false;
      if (SYSTEM_TITLE_PREFIXES.some(p => title.startsWith(p))) return false;
      if (item.type === 'system') return false;
      return true;
    });

    const { generateTicketCode } = await import('@/lib/utils');
    const validIds = new Set<string>();

    const addId = (val: string | number | undefined | null) => {
      if (!val) return;
      const s = String(val).trim();
      if (!s) return;
      validIds.add(s);
      validIds.add(s.toLowerCase());
      validIds.add(s.toUpperCase());
      const clean = s.toUpperCase().replace(/^NCC[-\s]*/i, '');
      validIds.add(clean);
      validIds.add(`NCC-${clean}`);
      validIds.add(`ncc-${clean.toLowerCase()}`);
    };

    addId(userId);
    addId(entryId);
    addId(userEmail);
    if (entryId) addId(generateTicketCode(entryId));
    if (userId) addId(generateTicketCode(userId));

    const normalizedUserStatus = String(userStatus || 'Pending').toLowerCase().trim();

    const filtered = nonSystemData.filter((item: any) => {
      const targetAudience = String(item.target_audience || 'All').trim();
      const targetLower = targetAudience.toLowerCase();

      // 1. Jika target_audience kosong atau 'All' / 'all', kirim ke semua peserta
      if (!item.target_audience || targetLower === 'all' || targetLower === 'semua') {
        return true;
      }
      
      // 2. Jika target audiens spesifik (manual untuk peserta tertentu)
      if (targetLower === 'specific' || targetLower === 'spesifik' || targetAudience === 'Spesifik (Manual)') {
        try {
          const parsed = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          const targetList: any[] = parsed?.target_user_ids || [];
          
          // 🔒 JIKA TARGET SPESIFIK TAPI LIST KOSONG, JANGAN PERNAH BOCOR KE SEMUA (HARUS FALSE)
          if (!Array.isArray(targetList) || targetList.length === 0) {
            return false;
          }
          
          return targetList.some((targetId: any) => {
            if (!targetId) return false;
            const strId = String(targetId).trim();
            const lowerId = strId.toLowerCase();
            const upperId = strId.toUpperCase();
            const cleanId = upperId.replace(/^NCC[-\s]*/i, '');

            return validIds.has(strId) || 
                   validIds.has(lowerId) || 
                   validIds.has(upperId) || 
                   validIds.has(cleanId) || 
                   validIds.has(`NCC-${cleanId}`);
          });
        } catch (e) {
          // 🔒 JIKA GAGAL PARSE KONTEN SPESIFIK, JANGAN BOCOR KE UMUM
          return false;
        }
      }

      // 3. Jika target audiens cocok dengan status (Verified/Pending)
      if (targetLower === normalizedUserStatus) {
        return true;
      }

      // Status 'Verified' / 'Lolos'
      if ((targetLower === 'verified' || targetLower === 'lolos') && normalizedUserStatus === 'verified') {
        return true;
      }

      // Status 'Pending' / 'Belum Lolos'
      if ((targetLower === 'pending' || targetLower === 'belum lolos') && normalizedUserStatus !== 'verified') {
        return true;
      }
      
      return false;
    });

    return { data: filtered, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception getParticipantBroadcasts:", err);
    return { data: [], error: err.message || "Gagal mengambil pengumuman." };
  }
}

/** Mengambil percakapan sekolah secara aman dari server (RLS bypass) */
export async function getSchoolMessages(schoolName: string, npsn?: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    let data: any[] = [];
    let error: any = null;

    if (schoolName) {
      // Prioritas 1: case-insensitive school_name match (ilike)
      const res = await client
        .from("school_messages")
        .select("*")
        .ilike("school_name", schoolName.trim())
        .order("created_at", { ascending: true })
        .limit(150);
      data = res.data || [];
      error = res.error;

      // Jika tidak ada hasil dan ada NPSN, coba juga dengan NPSN
      if (!error && data.length === 0 && npsn) {
        const res2 = await client
          .from("school_messages")
          .select("*")
          .eq("npsn", String(npsn).trim())
          .order("created_at", { ascending: true })
          .limit(150);
        if (!res2.error) data = res2.data || [];
      }
    } else if (npsn) {
      const res = await client
        .from("school_messages")
        .select("*")
        .eq("npsn", String(npsn).trim())
        .order("created_at", { ascending: true })
        .limit(150);
      data = res.data || [];
      error = res.error;
    }

    return { data: data, error: error ? error.message : null };
  } catch (err: any) {
    console.error("[Server Action] Exception getSchoolMessages:", err);
    return { data: [], error: err.message || "Gagal mengambil pesan." };
  }
}

/** Mengambil setting portal secara aman dari server (RLS bypass) */
export async function getPortalSettings() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data, error } = await client
      .from('announcements')
      .select('*')
      .eq('title', 'SYS_PORTAL_SETTINGS')
      .maybeSingle();

    return { data: data || null, error: error ? error.message : null };
  } catch (err: any) {
    console.error("[Server Action] Exception getPortalSettings:", err);
    return { data: null, error: err.message || "Gagal mengambil settings." };
  }
}

/** Mengambil konfigurasi timeline secara aman dari server (RLS bypass) */
export async function getTimelineConfig() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data, error } = await client
      .from('announcements')
      .select('*')
      .eq('title', 'SYSTEM_TIMELINE_CONFIG')
      .maybeSingle();

    return { data: data || null, error: error ? error.message : null };
  } catch (err: any) {
    console.error("[Server Action] Exception getTimelineConfig:", err);
    return { data: null, error: err.message || "Gagal mengambil timeline." };
  }
}

/** Mengambil sesi ujian CBT aktif secara aman dari server (RLS bypass) */
export async function getActiveExams() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data, error } = await client
      .from('cbt_exams')
      .select('id, title, token, duration_minutes, is_active')
      .eq('is_active', true);

    return { data: data || [], error: error ? error.message : null };
  } catch (err: any) {
    console.error("[Server Action] Exception getActiveExams:", err);
    return { data: [], error: err.message || "Gagal mengambil data CBT." };
  }
}

/** Mengambil konfigurasi token CBT secara aman dari server (RLS bypass) */
export async function getTokenSettings() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data, error } = await client
      .from('announcements')
      .select('*')
      .eq('title', 'SYS_TOKEN_SETTINGS')
      .maybeSingle();

    if (data && data.content) {
      try {
        const parsed = JSON.parse(data.content);
        return { data: parsed, error: null };
      } catch (e) {
        return { data: null, error: "Format settings tidak valid." };
      }
    }

    return { 
      data: {
        tokenEnabled: true,
        tokenIntervalMinutes: 10,
        isTokenPaused: false,
        pausedAt: null,
        updatedAt: new Date().toISOString()
      }, 
      error: null 
    };
  } catch (err: any) {
    console.error("[Server Action] Exception getTokenSettings:", err);
    return { data: null, error: err.message || "Gagal mengambil token settings." };
  }
}

/** Menyimpan konfigurasi token CBT secara aman ke server (RLS bypass) */
export async function saveTokenSettings(settings: {
  tokenEnabled: boolean;
  tokenIntervalMinutes: number;
  isTokenPaused: boolean;
  pausedAt?: number | null;
}) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const contentJson = JSON.stringify({
      ...settings,
      updatedAt: new Date().toISOString()
    });

    const { data: existing } = await client
      .from('announcements')
      .select('id')
      .eq('title', 'SYS_TOKEN_SETTINGS')
      .maybeSingle();

    if (existing) {
      // Update: hanya kolom content yang pasti ada di announcements
      const { error } = await client
        .from('announcements')
        .update({ content: contentJson })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await client
        .from('announcements')
        .insert([{
          title: 'SYS_TOKEN_SETTINGS',
          content: contentJson,
          type: 'system',
          target_audience: 'all'
        }]);
      if (error) throw error;
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception saveTokenSettings:", err);
    return { success: false, error: err.message || "Gagal menyimpan token settings." };
  }
}

/** Mengambil konfigurasi rekening & instruksi pembayaran kustom (Bypass RLS) */
export async function getPaymentConfig() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data: record } = await client
      .from('announcements')
      .select('content')
      .eq('title', 'SYS_PAYMENT_CONFIG')
      .maybeSingle();

    if (record && record.content) {
      try {
        const parsed = JSON.parse(record.content);
        return { data: parsed, error: null };
      } catch (e) {}
    }

    // Default configuration jika belum diset
    return {
      data: {
        bankName: "Bank Mandiri",
        bankBadge: "MANDIRI",
        accountNumber: "123-456-789-0123",
        accountHolder: "Panitia National Creativity Competition",
        amount: 150000,
        amountFormatted: "Rp 150.000",
        description: "Untuk mengaktifkan kepesertaan Anda di cabang {category}, silakan lakukan transfer administrasi pendaftaran:"
      },
      error: null
    };
  } catch (err: any) {
    console.error("[Server Action] Exception getPaymentConfig:", err);
    return { data: null, error: err.message || "Gagal mengambil config pembayaran." };
  }
}

/** Menyimpan konfigurasi rekening & instruksi pembayaran kustom (Bypass RLS) */
export async function savePaymentConfig(config: {
  bankName: string;
  bankBadge?: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  amountFormatted?: string;
  description?: string;
}) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const contentJson = JSON.stringify({
      ...config,
      updatedAt: new Date().toISOString()
    });

    const { data: existing } = await client
      .from('announcements')
      .select('id')
      .eq('title', 'SYS_PAYMENT_CONFIG')
      .maybeSingle();

    if (existing) {
      const { error } = await client
        .from('announcements')
        .update({ content: contentJson })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await client
        .from('announcements')
        .insert([{
          title: 'SYS_PAYMENT_CONFIG',
          content: contentJson,
          type: 'system',
          target_audience: 'all'
        }]);
      if (error) throw error;
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception savePaymentConfig:", err);
    return { success: false, error: err.message || "Gagal menyimpan config pembayaran." };
  }
}

/** Mengambil data CCTV Monitor Per Sesi Ujian (Bypass RLS via Service Role & Cross-Match) */
export async function getCbtMonitorData(examId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    // 1. Ambil info ujian
    const { data: examData } = await client
      .from('cbt_exams')
      .select('id, title, token, duration_minutes, is_active')
      .eq('id', examId)
      .maybeSingle();

    // 2. Ambil attempts untuk exam ini (baik yang memakai id uuid, string id, atau session context)
    let { data: attempts, error: aError } = await client
      .from('cbt_attempts')
      .select('*')
      .eq('exam_id', examId)
      .order('updated_at', { ascending: false });

    // Jika attempts kosong via query langsung (misal exam_id disimpan beda format), lakukan cross-check
    if (!attempts || attempts.length === 0) {
      const { data: allAttempts } = await client
        .from('cbt_attempts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (allAttempts && allAttempts.length > 0) {
        // Cek apakah ada attempt yang exam_id-nya cocok atau bernilai falsy / token
        const matched = allAttempts.filter((a: any) => 
          !a.exam_id || 
          String(a.exam_id).toLowerCase() === String(examId).toLowerCase() ||
          (examData?.token && String(a.exam_id).toLowerCase() === String(examData.token).toLowerCase())
        );
        if (matched.length > 0) {
          attempts = matched;
        }
      }
    }

    // 3. Ambil data profil & competition_entries untuk enrich nama & sekolah
    const { data: entriesData } = await client
      .from('competition_entries')
      .select('*');

    const { data: profilesData } = await client
      .from('profiles')
      .select('*');

    return {
      exam: examData || null,
      attempts: attempts || [],
      entries: entriesData || [],
      profiles: profilesData || [],
      error: null
    };
  } catch (err: any) {
    console.error("[Server Action] Exception getCbtMonitorData:", err);
    return {
      exam: null,
      attempts: [],
      entries: [],
      profiles: [],
      error: err.message || "Gagal mengambil data CCTV monitor."
    };
  }
}

/** Membuka blokir akses peserta ujian CBT (Bypass RLS) */
export async function unlockCbtParticipant(examId: string, userId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { error } = await client
      .from('cbt_attempts')
      .update({ violations_count: 0, warnings_count: 0, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception unlockCbtParticipant:", err);
    return { success: false, error: err.message || "Gagal membuka blokir peserta." };
  }
}

/** Memaksa kumpulkan (submit) jawaban ujian peserta CBT (Bypass RLS) */
export async function forceSubmitCbtParticipant(examId: string, userId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { error } = await client
      .from('cbt_attempts')
      .update({ 
        submitted_at: new Date().toISOString(), 
        status: 'submitted',
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception forceSubmitCbtParticipant:", err);
    return { success: false, error: err.message || "Gagal force submit peserta." };
  }
}

/** Mengambil Link Grup WhatsApp Peserta (Bypass RLS) */
export async function getGroupLinks() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data: record } = await client
      .from('announcements')
      .select('content')
      .eq('title', 'SYS_COMMUNITY_GROUPS')
      .maybeSingle();

    if (record && record.content) {
      try {
        const parsed = JSON.parse(record.content);
        return { data: parsed, error: null };
      } catch (e) {}
    }

    // Tidak ada data tersimpan — kembalikan data kosong (bukan placeholder sample)
    return {
      data: {
        general: "",
        mipa: "",
        lkti: "",
        speech: "",
        mtq: ""
      },
      error: null
    };
  } catch (err: any) {
    console.error("[Server Action] Exception getGroupLinks:", err);
    return { data: null, error: err.message || "Gagal mengambil link grup." };
  }
}

/** Menyimpan Link Grup WhatsApp Peserta (Bypass RLS) */
export async function saveGroupLinks(links: Record<string, string>) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const contentJson = JSON.stringify({
      ...links,
      updatedAt: new Date().toISOString()
    });

    const { data: existing } = await client
      .from('announcements')
      .select('id')
      .eq('title', 'SYS_COMMUNITY_GROUPS')
      .maybeSingle();

    if (existing) {
      // Update: hanya ubah kolom 'content' yang pasti ada
      const { error } = await client
        .from('announcements')
        .update({ content: contentJson })
        .eq('id', existing.id);
      if (error) {
        console.error("[Server Action] saveGroupLinks UPDATE error:", error.message, error.details);
        throw error;
      }
    } else {
      // Insert baru dengan kolom minimum yang wajib
      const { error } = await client
        .from('announcements')
        .insert([{
          title: 'SYS_COMMUNITY_GROUPS',
          content: contentJson,
          type: 'system',
          target_audience: 'all'
        }]);
      if (error) {
        console.error("[Server Action] saveGroupLinks INSERT error:", error.message, error.details);
        throw error;
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception saveGroupLinks:", err);
    return { success: false, error: err.message || "Gagal menyimpan link grup." };
  }
}

/** Ambil Data Ujian & Soal via Service Role (Bypass RLS untuk peserta non-auth) */
export async function getExamDataServer(examId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const [examRes, qRes] = await Promise.all([
      client
        .from('cbt_exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle(),
      client
        .from('cbt_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })
    ]);

    return {
      exam: examRes.data || null,
      questions: qRes.data || [],
      error: examRes.error?.message || qRes.error?.message || null
    };
  } catch (err: any) {
    console.error("[Server Action] Exception getExamDataServer:", err);
    return { exam: null, questions: [], error: err.message || "Gagal mengambil data ujian." };
  }
}

/** Mengambil data pengerjaan peserta tanpa membuat sesi baru (Read-only, Bypass RLS) */
export async function getCbtParticipantAttempt(examId: string, userId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data: existing, error } = await client
      .from('cbt_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) throw error;
    return { data: existing || null, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception getCbtParticipantAttempt:", err);
    return { data: null, error: err.message || "Gagal mengambil status pengerjaan." };
  }
}

/** Rekam Kehadiran/Mulai Ujian Peserta CBT (Bypass RLS) */
export async function initCbtParticipantAttempt(examId: string, userId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data: existing } = await client
      .from('cbt_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .maybeSingle();

    if (existing) {
      // Perbarui timestamp aktif
      await client
        .from('cbt_attempts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { data: existing, error: null };
    }

    // Insert attempt baru
    const { data: created, error } = await client
      .from('cbt_attempts')
      .insert([{
        user_id: userId,
        exam_id: examId,
        violations_count: 0,
        warnings_count: 0,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return { data: created, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception initCbtParticipantAttempt:", err);
    return { data: null, error: err.message || "Gagal inisialisasi attempt." };
  }
}

/** Catat Pelanggaran Proctoring CBT secara Instan (Bypass RLS) */
export async function recordCbtViolation(examId: string, userId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { data: attempt } = await client
      .from('cbt_attempts')
      .select('id, violations_count')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .maybeSingle();

    const currentCount = attempt?.violations_count || 0;
    const newCount = currentCount + 1;

    if (attempt) {
      await client
        .from('cbt_attempts')
        .update({
          violations_count: newCount,
          warnings_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', attempt.id);
    } else {
      await client
        .from('cbt_attempts')
        .insert([{
          user_id: userId,
          exam_id: examId,
          violations_count: newCount,
          warnings_count: newCount,
          updated_at: new Date().toISOString()
        }]);
    }

    return { success: true, count: newCount, isBlocked: newCount >= 3, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception recordCbtViolation:", err);
    return { success: false, count: 0, isBlocked: false, error: err.message || "Gagal merekam pelanggaran." };
  }
}

/** Menyimpan Jawaban Sementara / Draft Ujian CBT (Bypass RLS) */
export async function saveCbtDraftAnswers(examId: string, userId: string, answers: any) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const { error } = await client
      .from('cbt_attempts')
      .update({
        answers: answers,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('exam_id', examId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception saveCbtDraftAnswers:", err);
    return { success: false, error: err.message || "Gagal menyimpan draft jawaban." };
  }
}

/** Submit Ujian CBT & Kalkulasi Nilai Akhir (Bypass RLS) */
export async function submitCbtExamAnswers(examId: string, userId: string, answers: any, score: number) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const nowIso = new Date().toISOString();
    const updatePayload = {
      answers: answers,
      score: score,
      final_score: score,
      status: 'submitted',
      submitted_at: nowIso,
      updated_at: nowIso
    };

    // 1. Coba update record yang cocok dengan user_id & exam_id
    const { data: updated, error: updateErr } = await client
      .from('cbt_attempts')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .select('id');

    // 2. Jika belum ada attempt (atau user_id format beda), coba match user_id saja
    if (!updated || updated.length === 0) {
      const { data: updatedByUser } = await client
        .from('cbt_attempts')
        .update({
          ...updatePayload,
          exam_id: examId
        })
        .eq('user_id', userId)
        .select('id');

      if (!updatedByUser || updatedByUser.length === 0) {
        // 3. Jika belum ada record sama sekali, insert baru
        const { error: insertErr } = await client
          .from('cbt_attempts')
          .insert([{
            user_id: userId,
            exam_id: examId,
            violations_count: 0,
            warnings_count: 0,
            ...updatePayload
          }]);

        if (insertErr) throw insertErr;
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Server Action] Exception submitCbtExamAnswers:", err);
    return { success: false, error: err.message || "Gagal submit jawaban ujian." };
  }
}

/** Mengambil Data Papan Skor / Leaderboard CBT dengan Evaluasi Soal (Bypass RLS) */
export async function getLeaderboardDataServer(examId: string) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const [examRes, qRes, aRes, eRes, pRes] = await Promise.all([
      client.from('cbt_exams').select('*').eq('id', examId).maybeSingle(),
      client.from('cbt_questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true }),
      client.from('cbt_attempts').select('*').eq('exam_id', examId).order('updated_at', { ascending: false }),
      client.from('competition_entries').select('*'),
      client.from('profiles').select('*')
    ]);

    let attempts = aRes.data || [];

    // Jika attempts kosong, cek apakah ada attempt dengan token atau format id berbeda
    if (!attempts || attempts.length === 0) {
      const { data: allAttempts } = await client
        .from('cbt_attempts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (allAttempts && allAttempts.length > 0) {
        const matched = allAttempts.filter((a: any) => 
          !a.exam_id || 
          String(a.exam_id).toLowerCase() === String(examId).toLowerCase() ||
          (examRes.data?.token && String(a.exam_id).toLowerCase() === String(examRes.data.token).toLowerCase())
        );
        if (matched.length > 0) {
          attempts = matched;
        }
      }
    }

    return {
      exam: examRes.data || null,
      questions: qRes.data || [],
      attempts: attempts,
      entries: eRes.data || [],
      profiles: pRes.data || [],
      error: null
    };
  } catch (err: any) {
    console.error("[Server Action] Exception getLeaderboardDataServer:", err);
    return {
      exam: null,
      questions: [],
      attempts: [],
      entries: [],
      error: err.message || "Gagal mengambil data papan skor."
    };
  }
}



