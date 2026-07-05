"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RequireLoginLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  message?: string;
};

export default function RequireLoginLink({
  href,
  children,
  className,
  message = "请登录后尝试。",
}: RequireLoginLinkProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [showModal, setShowModal] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleClick() {
    setChecking(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setChecking(false);
      setShowModal(true);
      return;
    }

    const { data: adminRoleData, error: adminRoleError } = await supabase.rpc(
      "get_current_admin_role"
    );

    if (!adminRoleError && Array.isArray(adminRoleData) && adminRoleData[0]) {
      setChecking(false);
      router.push("/admin");
      return;
    }

    setChecking(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={checking}
        className={
          className ||
          "rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {checking ? "检查登录状态..." : children}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl">
            <div>
              <p className="text-sm text-neutral-400">需要登录</p>

              <h2 className="mt-2 text-2xl font-bold">请登录后尝试</h2>
            </div>

            <p className="mt-4 text-neutral-400">{message}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="rounded-2xl bg-white px-5 py-3 text-center font-medium text-black hover:bg-neutral-200"
              >
                去登录
              </Link>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-2xl border border-neutral-700 px-5 py-3 font-medium text-white hover:border-neutral-400"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}