import { NextRequest, NextResponse } from "next/server";
import { getWechatOpenIdHash } from "@/lib/auth";
import { parseDateParam, toDateKey } from "@/lib/date";
import { readStore, resolveStudentForWechat, upsertSignInRecord, writeStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    date?: string;
    studentId?: string;
    reason?: string;
  };
  const data = await readStore();
  if (!body.studentId) {
    return NextResponse.json({ error: "请先选择自己的姓名。" }, { status: 400 });
  }
  const openIdHash = getWechatOpenIdHash(request);
  let student;
  if (openIdHash) {
    const identity = resolveStudentForWechat(data, openIdHash, body.studentId);
    if ("error" in identity) {
      return NextResponse.json({ error: identity.error }, { status: identity.status });
    }
    student = identity.student;
  } else {
    student = data.students.find((item) => item.active && item.id === body.studentId);
    if (!student) {
      return NextResponse.json({ error: "未找到对应的学生档案，请重新选择姓名。" }, { status: 404 });
    }
  }

  const dateKey = toDateKey(parseDateParam(body.date));
  const reason = body.reason?.trim() || "已提交请假";
  upsertSignInRecord(data, {
    date: dateKey,
    studentId: student.id,
    status: "leave",
    note: reason,
    source: "qr_name_location_leave"
  });
  await writeStore(data);

  return NextResponse.json({
    ok: true,
    studentName: student.name,
    status: "leave",
    note: reason
  });
}
