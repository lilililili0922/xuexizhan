import { NextRequest, NextResponse } from "next/server";
import { getDailyContent, getSignInSummary, readStore } from "@/lib/store";
import { parseDateParam, toDateKey } from "@/lib/date";

export async function GET(request: NextRequest) {
  const date = toDateKey(parseDateParam(request.nextUrl.searchParams.get("date")));
  const data = await readStore();
  const daily = getDailyContent(data, date);
  return NextResponse.json(getSignInSummary(data, date, daily.signInCutoff));
}
