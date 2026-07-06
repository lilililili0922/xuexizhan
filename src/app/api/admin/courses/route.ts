import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";
import { Course } from "@/types/domain";

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as Partial<Course>;
  if (!body.title || !body.startsAt || !body.endsAt || !body.meetingUrl) {
    return NextResponse.json(
      { error: "title、startsAt、endsAt、meetingUrl 为必填。" },
      { status: 400 }
    );
  }

  const data = await readStore();
  const existing = body.id ? data.courses.find((course) => course.id === body.id) : undefined;
  const next: Course = {
    id: existing?.id ?? `course-${Date.now()}`,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    title: body.title,
    teacher: body.teacher || "待安排",
    audience: body.audience || "UX、视觉",
    room: body.room || "待补充",
    meetingUrl: body.meetingUrl,
    replayUrl: body.replayUrl || "",
    isNew: Boolean(body.isNew),
    enabled: body.enabled ?? true
  };
  if (existing) Object.assign(existing, next);
  else data.courses.push(next);
  await writeStore(data);
  return NextResponse.json({ ok: true, course: next });
}
