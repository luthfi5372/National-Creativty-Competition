import { NextResponse } from 'next/server';
import { getAdminCompetitionEntries } from '@/app/actions/auth';
import { createClient } from '@supabase/supabase-js';
import { generateTicketCode } from '@/lib/utils';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: attempts } = await supabase.from('cbt_attempts').select('*');
    const { data: entries } = await getAdminCompetitionEntries();

    const mappedEntries = (entries || []).map(entry => {
      let customTicketId = "";
      if (entry.notes) {
        try {
          const notesObj = JSON.parse(entry.notes);
          customTicketId = notesObj.custom_ticket_id || "";
        } catch (e) {}
      }
      return {
        id: entry.id,
        full_name: entry.full_name,
        school_name: entry.school_name,
        custom_ticket_id: customTicketId,
        generated_ticket: `NCC-${generateTicketCode(entry.id)}`
      };
    });

    return NextResponse.json({
      attempts: attempts || [],
      entries: mappedEntries
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
