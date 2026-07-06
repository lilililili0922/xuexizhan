import { NextRequest, NextResponse } from "next/server";
import {
  createDemoWechatOpenIdHash,
  createWechatAuthorizeUrl,
  getWechatOpenIdHash,
  sanitizeRedirect,
  setWechatSessionCookie
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const redirect = sanitizeRedirect(
    request.nextUrl.searchParams.get("redirect"),
    request.nextUrl.origin
  );
  const authorizeUrl = createWechatAuthorizeUrl(request.nextUrl.origin, redirect);

  if (authorizeUrl) {
    return NextResponse.redirect(authorizeUrl);
  }

  const url = new URL(redirect, request.nextUrl.origin);
  url.searchParams.set("wechat", "mock");
  const response = NextResponse.redirect(url);
  setWechatSessionCookie(response, getWechatOpenIdHash(request) || createDemoWechatOpenIdHash());
  return response;
}
