import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStore, upsertSignInRecord, writeStore } from "@/lib/store";
import { SignInStatus } from "@/types/domain";

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as {
    date?: string;
    studentId?: string;
    status?: SignInStatus;
    arrivedAt?: string;
    note?: string;
  };
  if (!body.date || !body.studentId || !body.status) {
    return NextResponse.json({ error: "date、studentId、status 为必填。" }, { status: 400 });
  }

  const data = await readStore();
  upsertSignInRecord(data, {
    date: body.date,
    studentId: body.studentId,
    status: body.status,
    arrivedAt: body.arrivedAt,
    note: body.note
  });
  await writeStore(data);
  return NextResponse.json({ ok: true });
}
