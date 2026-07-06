import { NextRequest, NextResponse } from "next/server";
import { createComment, getVisibleComments, readStore, writeStore } from "@/lib/store";
import { requireWechatSession } from "@/lib/auth";

export async function GET() {
  const data = await readStore();
  return NextResponse.json({ comments: getVisibleComments(data) });
}

export async function POST(request: NextRequest) {
  const auth = requireWechatSession(request);
  if (auth.response) return auth.response;

  const body = (await request.json()) as { content?: string; parentId?: string };
  const content = body.content?.trim() || "";
  if (content.length < 2 || content.length > 240) {
    return NextResponse.json({ error: "心声内容需为 2-240 个字。" }, { status: 400 });
  }

  const data = await readStore();
  const parentId = body.parentId?.trim() || null;
  if (parentId) {
    const parent = data.comments.find((item) => item.id === parentId && item.status === "approved");
    if (!parent) {
      return NextResponse.json({ error: "被回复的心声不存在或暂不可见。" }, { status: 400 });
    }
  }

  const comment = createComment({ content, openIdHash: auth.openIdHash, parentId });
  data.comments.unshift(comment);
  await writeStore(data);

  return NextResponse.json({
    comment,
    visibleImmediately: comment.status === "approved"
  });
}
