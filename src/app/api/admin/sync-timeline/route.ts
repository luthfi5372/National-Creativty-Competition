import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanData = body.cleanData || body.timeline;

    if (!cleanData) {
      return NextResponse.json({ success: false, error: 'Data timeline tidak ditemukan' }, { status: 400 });
    }

    // Gunakan service role client agar bypass RLS secara handal di server
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const supabase = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey || anonKey,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // 1. Cari data lama
    const { data: existing } = await supabase
      .from('announcements')
      .select('id')
      .eq('title', 'SYSTEM_TIMELINE_CONFIG')
      .single();

    let dbError = null;
    let dbData = null;

    if (existing) {
      // 2. Update
      const { data: updatedData, error: updateError } = await supabase
        .from('announcements')
        .update({ content: JSON.stringify(cleanData) })
        .eq('id', existing.id)
        .select();
      dbError = updateError;
      dbData = updatedData;
    } else {
      // 3. Insert
      const { data: insertedData, error: insertError } = await supabase
        .from('announcements')
        .insert([{
          title: 'SYSTEM_TIMELINE_CONFIG',
          message: 'SYSTEM_TIMELINE_CONFIG',
          content: JSON.stringify(cleanData),
          target_audience: 'All'
        }])
        .select();
      dbError = insertError;
      dbData = insertedData;
    }

    if (dbError) {
      console.error("SUPABASE ERROR:", dbError);
      return NextResponse.json({
        success: false,
        error: dbError.message
      }, { status: 400 });
    }

    if (!dbData || dbData.length === 0) {
      console.error("SUPABASE: No rows affected");
      return NextResponse.json({
        success: false,
        error: "Gagal menyimpan: Baris tidak terpengaruh atau akses ditolak (kebijakan RLS Supabase)."
      }, { status: 403 });
    }

    // ⚡ REVALIDASI CACHE — hapus cache Vercel agar halaman depan langsung fresh
    revalidatePath('/dashboard');
    revalidatePath('/');

    return NextResponse.json({ success: true, message: 'Sync Success' }, { status: 200 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
