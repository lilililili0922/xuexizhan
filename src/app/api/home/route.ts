import { NextRequest, NextResponse } from "next/server";
import { getHomePayload } from "@/lib/store";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const payload = await getHomePayload(date);
  return NextResponse.json(payload);
}
