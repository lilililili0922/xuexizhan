import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const data = await readStore();
  const comment = data.comments.find((item) => item.id === id && item.status === "approved");
  if (!comment) return NextResponse.json({ error: "评论不存在或不可见。" }, { status: 404 });
  comment.likeCount += 1;
  await writeStore(data);
  return NextResponse.json({ likeCount: comment.likeCount });
}
