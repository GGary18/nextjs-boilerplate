"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthStatus = "loading" | "logged-in" | "logged-out";

type AdminRole = {
  role: "super_admin" | "cssa_admin";
  school_short_name: string | null;
};

type AuthNavProps = {
  className?: string;
};

export default function AuthNav({ className }: AuthNavProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("logged-out");
        setAdminRole(null);
        return;
      }

      setStatus("logged-in");

      const { data, error } = await supabase.rpc("get_current_admin_role");

      if (error) {
        console.error(error.message);
        setAdminRole(null);
        return;
      }

      const role = Array.isArray(data) ? data[0] : null;

      if (!role) {
        setAdminRole(null);
        return;
      }

      setAdminRole({
        role: role.role,
        school_short_name: role.school_short_name,
      });
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setStatus("logged-out");
        setAdminRole(null);
        return;
      }

      setStatus("logged-in");

      const { data, error } = await supabase.rpc("get_current_admin_role");

      if (error) {
        console.error(error.message);
        setAdminRole(null);
        return;
      }

      const role = Array.isArray(data) ? data[0] : null;

      if (!role) {
        setAdminRole(null);
        return;
      }

      setAdminRole({
        role: role.role,
        school_short_name: role.school_short_name,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error.message);
      setSigningOut(false);
      return;
    }

    setStatus("logged-out");
    setAdminRole(null);
    setSigningOut(false);

    router.push("/");
    router.refresh();
  }

  if (status === "loading") {
    return (
      <span className={className || "text-sm text-neutral-500"}>
        检查登录状态...
      </span>
    );
  }

  if (status === "logged-in") {
    return (
      <div className="flex items-center gap-4">
        {adminRole ? (
          <Link
            href="/admin"
            className={className || "text-sm text-neutral-300 hover:text-white"}
          >
            管理后台
          </Link>
        ) : (
          <Link
            href="/profile"
            className={className || "text-sm text-neutral-300 hover:text-white"}
          >
            个人主页
          </Link>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm text-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? "退出中..." : "退出"}
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className={className || "text-sm text-neutral-300 hover:text-white"}
    >
      登录
    </Link>
  );
}