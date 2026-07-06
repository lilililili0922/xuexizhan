import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as {
    date?: string;
    readerName?: string;
    notice?: string;
    pinnedMessage?: string;
    signInCutoff?: string;
    signInLocationName?: string;
    signInLatitude?: number;
    signInLongitude?: number;
    signInRadiusMeters?: number;
  };
  if (!body.date) return NextResponse.json({ error: "date 为必填。" }, { status: 400 });

  const data = await readStore();
  const existing = data.dailyContents.find((item) => item.date === body.date);
  const next = {
    date: body.date,
    readerName: body.readerName?.trim() || "待安排",
    notice: body.notice?.trim() || "今天暂无特别注意事项。",
    pinnedMessage: body.pinnedMessage?.trim() || "把今天这一步走稳。",
    signInCutoff: body.signInCutoff?.trim() || "09:00",
    signInLocationName:
      body.signInLocationName?.trim() || existing?.signInLocationName || "北京校区签到点",
    signInLatitude: body.signInLatitude ?? existing?.signInLatitude ?? 39.9042,
    signInLongitude: body.signInLongitude ?? existing?.signInLongitude ?? 116.4074,
    signInRadiusMeters: body.signInRadiusMeters ?? existing?.signInRadiusMeters ?? 250
  };
  if (existing) Object.assign(existing, next);
  else data.dailyContents.push(next);
  await writeStore(data);
  return NextResponse.json({ ok: true, dailyContent: next });
}
