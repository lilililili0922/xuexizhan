import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const DEMO_ADMIN_TOKEN = "teacher-demo";
const WECHAT_SESSION_COOKIE = "slh_wechat_openid_hash";
const WECHAT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const DEMO_STATE_SECRET = "student-learning-demo-state";

type WechatTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

export function getWechatOpenIdHash(request: NextRequest) {
  return (
    request.headers.get("x-wechat-openid-hash")?.trim() ||
    request.cookies.get(WECHAT_SESSION_COOKIE)?.value ||
    ""
  );
}

export function requireWechatSession(request: NextRequest) {
  const openIdHash = getWechatOpenIdHash(request);
  if (!openIdHash) {
    return {
      openIdHash: "",
      response: NextResponse.json(
        {
          error: "需要微信登录后才能发布学生心声。",
          authUrl: "/api/auth/wechat/start?redirect=/"
        },
        { status: 401 }
      )
    };
  }
  return { openIdHash, response: null };
}

export function requireAdmin(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN || DEMO_ADMIN_TOKEN;
  const token = request.headers.get("x-admin-token") || "";
  if (token !== expected) {
    return NextResponse.json({ error: "无后台操作权限。" }, { status: 401 });
  }
  return null;
}

export function getWechatOAuthConfig() {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

function getWechatStateSecret() {
  return process.env.WECHAT_STATE_SECRET || process.env.ADMIN_TOKEN || DEMO_STATE_SECRET;
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function sanitizeRedirect(redirect: string | null, origin: string) {
  try {
    const url = new URL(redirect || "/", origin);
    if (url.origin !== origin) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function createWechatState(redirect: string) {
  const payload = JSON.stringify({ redirect, createdAt: Date.now() });
  const encodedPayload = toBase64Url(payload);
  const signature = crypto
    .createHmac("sha256", getWechatStateSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function parseWechatState(state: string | null) {
  if (!state) return null;
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = crypto
    .createHmac("sha256", getWechatStateSecret())
    .update(encodedPayload)
    .digest("base64url");
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as {
      redirect?: string;
      createdAt?: number;
    };
    if (!payload.redirect || !payload.createdAt) return null;
    if (Date.now() - payload.createdAt > 10 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashWechatOpenId(openId: string) {
  const salt =
    process.env.WECHAT_OPENID_SALT ||
    process.env.WECHAT_APP_SECRET ||
    "student-learning-demo-openid-salt";
  return `wx_${crypto.createHmac("sha256", salt).update(openId).digest("hex")}`;
}

export function createDemoWechatOpenIdHash() {
  return `wx_demo_${crypto.randomUUID()}`;
}

export function setWechatSessionCookie(response: NextResponse, openIdHash: string) {
  response.cookies.set(WECHAT_SESSION_COOKIE, openIdHash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WECHAT_COOKIE_MAX_AGE
  });
}

export function createWechatAuthorizeUrl(origin: string, redirect: string) {
  const config = getWechatOAuthConfig();
  if (!config) return null;
  const callbackUrl = new URL("/api/auth/wechat/callback", origin);
  const authorizeUrl = new URL("https://open.weixin.qq.com/connect/oauth2/authorize");
  authorizeUrl.searchParams.set("appid", config.appId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "snsapi_base");
  authorizeUrl.searchParams.set("state", createWechatState(redirect));
  return `${authorizeUrl.toString()}#wechat_redirect`;
}

export async function exchangeWechatCodeForOpenId(code: string) {
  const config = getWechatOAuthConfig();
  if (!config) throw new Error("Missing WECHAT_APP_ID or WECHAT_APP_SECRET.");

  const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  tokenUrl.searchParams.set("appid", config.appId);
  tokenUrl.searchParams.set("secret", config.appSecret);
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(tokenUrl, { cache: "no-store" });
  const result = (await response.json()) as WechatTokenResponse;
  if (!response.ok || result.errcode || !result.openid) {
    throw new Error(result.errmsg || "Failed to exchange WeChat OAuth code.");
  }
  return {
    openIdHash: hashWechatOpenId(result.openid),
    unionId: result.unionid || null
  };
}
