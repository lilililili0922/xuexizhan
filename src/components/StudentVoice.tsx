"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Heart, MessageSquareText, ShieldAlert } from "lucide-react";
import { StudentComment } from "@/types/domain";

type StudentVoiceProps = {
  initialComments: StudentComment[];
};

type WechatSession = {
  authenticated: boolean;
  student: {
    id: string;
    name: string;
  } | null;
};

export function StudentVoice({ initialComments }: StudentVoiceProps) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [wechatSession, setWechatSession] = useState<WechatSession | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  type CommentTreeNode = { comment: StudentComment; children: CommentTreeNode[] };

  const commentTree = useMemo(() => {
    const childrenMap = new Map<string, StudentComment[]>();
    const roots: StudentComment[] = [];

    comments.forEach((c) => {
      if (c.parentId) {
        const siblings = childrenMap.get(c.parentId) || [];
        siblings.push(c);
        childrenMap.set(c.parentId, siblings);
      } else {
        roots.push(c);
      }
    });

    childrenMap.forEach((children) => {
      children.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    function buildTree(comment: StudentComment): CommentTreeNode {
      return {
        comment,
        children: (childrenMap.get(comment.id) || []).map(buildTree),
      };
    }

    return roots.map(buildTree);
  }, [comments]);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const result = (await response.json()) as WechatSession;
        if (!active) return;
        setWechatSession(result);
        if (new URLSearchParams(window.location.search).get("wechat") === "mock") {
          setMessage("已完成模拟微信验证，当前仅用于本地演示。");
        }
      } catch {
        if (active) setWechatSession({ authenticated: false, student: null });
      }
    }
    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  const localStudentId = typeof window !== "undefined" ? window.localStorage.getItem("demo_signin_student_id") : null;
  const verified = Boolean(wechatSession?.authenticated) || !!localStudentId;

  function renderThread(node: CommentTreeNode, depth: number): React.ReactNode {
    const { comment, children } = node;
    const isRoot = depth === 0;
    const indent = !isRoot;
    const nested = children.length > 0;
    return (
      <article className="voice-thread" key={comment.id}>
        <div className={isRoot ? 'voice-item' : 'voice-reply'}>
          <div>
            <strong>{comment.anonymousName}</strong>
            <p>{comment.content}</p>
          </div>
          <div className="voice-item-actions">
            <button onClick={() => handleLike(comment.id)} type="button">
              <Heart size={15} />
              {comment.likeCount}
            </button>
            <button
              className="voice-reply-trigger"
              onClick={() => setReplyingTo((current) => (current === comment.id ? "" : comment.id))}
              type="button"
            >
              <MessageSquareText size={15} />
              回复
            </button>
          </div>
        </div>

        {nested && (
          <div className="voice-replies">
            {children.map((child) => renderThread(child, depth + 1))}
          </div>
        )}

        {replyingTo === comment.id ? (
          <form className="reply-form" onSubmit={(event) => handleReplySubmit(event, comment.id)}>
            <input
              value={replyContent}
              maxLength={160}
              minLength={2}
              onChange={(event) => setReplyContent(event.target.value)}
              placeholder={"回复 " + comment.anonymousName}
            />
            <button className="command-button" disabled={replySubmitting} type="submit">
              {replySubmitting ? "发送中" : "发送回复"}
            </button>
          </form>
        ) : null}
      </article>
    );
  }

  async function handleLogin() {
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `/api/auth/wechat/start?redirect=${encodeURIComponent(redirect)}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verified) {
      setMessage("请先签到后再发布心声。");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const sid = typeof window !== "undefined" ? window.localStorage.getItem("demo_signin_student_id") : null;
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ content, studentId: !wechatSession?.authenticated ? sid : undefined })
    });
    const result = (await response.json()) as {
      error?: string;
      visibleImmediately?: boolean;
      comment?: StudentComment;
    };
    setSubmitting(false);
    if (!response.ok || !result.comment) {
      setMessage(result.error || "发布失败，请稍后重试。");
      return;
    }
    setContent("");
    if (result.visibleImmediately) {
      setComments((current) => [result.comment!, ...current]);
      setMessage("已匿名发布。");
    } else {
      setMessage("内容已提交，等待老师审核后展示。");
    }
  }

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault();
    if (!verified) {
      setMessage("请先签到后再回复。");
      return;
    }

    setReplySubmitting(true);
    setMessage("");
    const rsid = typeof window !== "undefined" ? window.localStorage.getItem("demo_signin_student_id") : null;
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ content: replyContent, parentId, studentId: !wechatSession?.authenticated ? rsid : undefined })
    });
    const result = (await response.json()) as {
      error?: string;
      visibleImmediately?: boolean;
      comment?: StudentComment;
    };
    setReplySubmitting(false);
    if (!response.ok || !result.comment) {
      setMessage(result.error || "回复失败，请稍后重试。");
      return;
    }

    setReplyContent("");
    setReplyingTo("");
    if (result.visibleImmediately) {
      setComments((current) => [result.comment!, ...current]);
      setMessage("已匿名回复。");
    } else {
      setMessage("回复已提交，等待老师审核后展示。");
    }
  }

  async function handleLike(id: string) {
    const response = await fetch(`/api/comments/${id}/like`, { method: "POST" });
    if (!response.ok) return;
    const result = (await response.json()) as { likeCount: number };
    setComments((current) =>
      current.map((comment) =>
        comment.id === id ? { ...comment, likeCount: result.likeCount } : comment
      )
    );
  }

  return (
    <section className="panel voice-panel" id="student-voice">
      <div className="section-title-row">
        <div>
          <p className="eyebrow-text">STUDENT VOICE</p>
          <h2>学生心声角</h2>
        </div>
        <span className="soft-pill">{verified ? "已确认身份" : "需签到后发布"}</span>
      </div>

      <form className="voice-form" onSubmit={handleSubmit}>
        <textarea
          value={content}
          maxLength={240}
          minLength={2}
          onChange={(event) => setContent(event.target.value)}
          placeholder="匿名写下今天的疑问、收获或建议。"
        />
        <div className="voice-actions">
          <span>{content.length}/240</span>
          {verified ? (
            <button className="command-button" disabled={submitting} type="submit">
              <MessageSquareText size={17} />
              {submitting ? "发布中" : "匿名发布"}
            </button>
          ) : (
            <button className="command-button" onClick={handleLogin} type="button">
              <ShieldAlert size={17} />
              微信登录
            </button>
          )}
        </div>
      </form>

      {message ? <p className="inline-message">{message}</p> : null}

      <div className="voice-list">
        {commentTree.length === 0 ? (
          <div className="empty-state">今天还没有学生心声。</div>
        ) : (
          commentTree.slice(0, 4).map((node) => renderThread(node, 0))
        )}
      </div>
    </section>
  );
}
