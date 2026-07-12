import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const charPool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function oldGenerateTicketCode(id: number | string): string {
  if (!id) return "AAAAAA";
  let seed: number;
  const numId = typeof id === "number" ? id : parseInt(id, 10);
  if (!isNaN(numId)) {
    seed = (numId * 6364136223846793005 + 1442695040888963407) >>> 0;
    seed = (seed ^ (seed >>> 16)) >>> 0;
    seed = (seed * 1793 + 4821) % 2147483647;
  } else {
    let hash = 5381;
    const strId = String(id);
    for (let i = 0; i < strId.length; i++) {
      hash = ((hash << 5) + hash) ^ strId.charCodeAt(i);
      hash = hash >>> 0;
    }
    seed = hash;
  }
  let result = "";
  let s = seed;
  for (let i = 0; i < 6; i++) {
    s = (s * 9301 + 49297) % 233280;
    result += charPool[Math.floor((s / 233280) * charPool.length)];
  }
  return result;
}

function newGenerateTicketCode(id: number | string): string {
  if (!id) return "AAAAAA";
  let seed: number;
  const numId = typeof id === "number" ? id : parseInt(id, 10);
  if (!isNaN(numId)) {
    seed = (numId * 3512953 + 1234567) % 1073741824;
  } else {
    let hash = 5381;
    const strId = String(id);
    for (let i = 0; i < strId.length; i++) {
      hash = ((hash << 5) + hash) ^ strId.charCodeAt(i);
      hash = hash >>> 0;
    }
    seed = hash % 1073741824;
  }
  let result = "";
  let tempSeed = seed;
  for (let i = 0; i < 6; i++) {
    const idx = tempSeed % charPool.length;
    result += charPool[idx];
    tempSeed = Math.floor(tempSeed / charPool.length);
  }
  return result;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: entries } = await supabase.from('competition_entries').select('*');
    if (!entries) throw new Error("Gagal mengambil data entries");

    const { data: attempts } = await supabase.from('cbt_attempts').select('*');
    if (!attempts) throw new Error("Gagal mengambil data attempts");

    const logs: string[] = [];

    for (const attempt of attempts) {
      const examUserId = attempt.user_id;
      const cleanExamUserId = examUserId.replace("NCC-", "");

      const matchedEntry = entries.find(entry => {
        let customTicket = "";
        if (entry.notes) {
          try {
            const notesObj = JSON.parse(entry.notes);
            customTicket = (notesObj.custom_ticket_id || "").toUpperCase().replace("NCC-", "");
          } catch (e) {}
        }
        const oldGenTicket = oldGenerateTicketCode(entry.id);
        return oldGenTicket === cleanExamUserId || customTicket === cleanExamUserId;
      });

      if (matchedEntry) {
        let targetTicket = "";
        if (matchedEntry.notes) {
          try {
            const notesObj = JSON.parse(matchedEntry.notes);
            if (notesObj.custom_ticket_id) {
              targetTicket = notesObj.custom_ticket_id.toUpperCase();
            }
          } catch (e) {}
        }
        if (!targetTicket) {
          targetTicket = `NCC-${newGenerateTicketCode(matchedEntry.id)}`;
        }

        if (attempt.user_id !== targetTicket) {
          const { error: updateError } = await supabase
            .from('cbt_attempts')
            .update({ user_id: targetTicket })
            .eq('id', attempt.id);

          if (updateError) {
            logs.push(`Gagal update attempt ${attempt.id} (${attempt.user_id} -> ${targetTicket}): ${updateError.message}`);
          } else {
            logs.push(`Sukses update attempt ${attempt.id} untuk ${matchedEntry.full_name} (${attempt.user_id} -> ${targetTicket})`);
          }
        } else {
          logs.push(`Attempt ${attempt.id} sudah sesuai (${attempt.user_id})`);
        }
      } else {
        logs.push(`❌ Tidak menemukan entry pencocokan untuk attempt user_id: ${attempt.user_id}`);
      }
    }

    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
