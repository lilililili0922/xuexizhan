import { NextRequest, NextResponse } from "next/server";
import { getWechatOpenIdHash } from "@/lib/auth";
import { findActiveStudentByOpenIdHash, readStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const openIdHash = getWechatOpenIdHash(request);
  if (!openIdHash) {
    return NextResponse.json({
      authenticated: false,
      student: null
    });
  }

  const data = await readStore();
  const student = findActiveStudentByOpenIdHash(data, openIdHash);
  return NextResponse.json({
    authenticated: true,
    student: student
      ? {
          id: student.id,
          name: student.name
        }
      : null
  });
}
