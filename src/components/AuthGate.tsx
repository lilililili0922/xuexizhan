"use client";

import { ReactNode, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const commitState = (nextVerified: boolean) => {
      window.queueMicrotask(() => {
        setVerified(nextVerified);
        setReady(true);
      });
    };
    const params = new URLSearchParams(window.location.search);
    const mockLogin = params.get("wechat") === "mock";
    if (mockLogin) {
      const openIdHash = params.get("openid") || "hash_sheet_001";
      window.localStorage.setItem("demo_wechat_openid_hash", openIdHash);
      params.delete("wechat");
      params.delete("openid");
      const nextSearch = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
      );
      commitState(true);
      return;
    }

    const stored = window.localStorage.getItem("demo_wechat_openid_hash");
    if (stored?.startsWith("hash_mock_")) {
      window.localStorage.setItem("demo_wechat_openid_hash", "hash_sheet_001");
      commitState(true);
      return;
    }

    commitState(Boolean(stored));
  }, []);

  function startLogin() {
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `/api/auth/wechat/start?redirect=${encodeURIComponent(redirect)}`;
  }

  if (!ready) {
    return <section className="auth-gate">正在校验微信身份...</section>;
  }

  if (!verified) {
    return (
      <section className="auth-gate">
        <div>
          <p className="eyebrow-text">WECHAT VERIFY</p>
          <h1>微信验证后进入学习站</h1>
          <p>签到、请假和学生心声都会绑定微信身份；学生端默认匿名展示。</p>
          <button className="command-button" onClick={startLogin} type="button">
            <ShieldCheck size={18} />
            微信验证进入
          </button>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
