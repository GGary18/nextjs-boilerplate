"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeletePostButton({
  postId,
  table,
  onDeleted,
}: {
  postId: string;
  table: "listings" | "housing_posts";
  onDeleted?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!/^\d{4}$/.test(code)) {
      setMessage("请输入四位数字删除码。");
      return;
    }

    setDeleting(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/posts/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ table, postId, deleteCode: code }),
    });
    const result = (await response.json()) as { error?: string };

    setDeleting(false);

    if (!response.ok) {
      setMessage(result.error || "删除失败，请稍后再试。");
      return;
    }

    setOpen(false);
    onDeleted?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-900 px-4 py-2 text-sm text-red-300 hover:border-red-500"
      >
        删除
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl">
            <h2 className="text-2xl font-bold">删除帖子</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              删除后帖子和关联图片将无法恢复。请输入发布时设置的四位数字删除码。
            </p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="四位删除码"
              className="mt-5 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 outline-none focus:border-neutral-500"
            />
            {message && <p className="mt-3 text-sm text-red-300">{message}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-red-500 px-5 py-3 font-medium text-white disabled:opacity-60"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-neutral-700 px-5 py-3"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
