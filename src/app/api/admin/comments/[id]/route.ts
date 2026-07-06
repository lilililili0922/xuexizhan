import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";
import { CommentStatus } from "@/types/domain";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json()) as { status?: CommentStatus };
  if (!body.status) return NextResponse.json({ error: "status 为必填。" }, { status: 400 });

  const data = await readStore();
  const comment = data.comments.find((item) => item.id === id);
  if (!comment) return NextResponse.json({ error: "评论不存在。" }, { status: 404 });
  comment.status = body.status;
  await writeStore(data);
  return NextResponse.json({ ok: true, comment });
}
