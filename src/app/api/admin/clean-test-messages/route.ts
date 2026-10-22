import { NextResponse } from "next/server";
import { clearTestSchoolMessages } from "@/app/actions/auth";

export async function GET() {
  try {
    const result = await clearTestSchoolMessages();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
