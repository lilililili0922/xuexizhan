import { NextRequest, NextResponse } from "next/server";
import {
  exchangeWechatCodeForOpenId,
  parseWechatState,
  setWechatSessionCookie
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const state = parseWechatState(request.nextUrl.searchParams.get("state"));
  const redirectPath = state?.redirect || "/";
  const redirectUrl = new URL(redirectPath, request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    redirectUrl.searchParams.set("wechat_error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const session = await exchangeWechatCodeForOpenId(code);
    redirectUrl.searchParams.set("wechat", "oauth");
    const response = NextResponse.redirect(redirectUrl);
    setWechatSessionCookie(response, session.openIdHash);
    return response;
  } catch (error) {
    console.error(error);
    redirectUrl.searchParams.set("wechat_error", "oauth_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
