"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminRole = {
  role: "super_admin" | "cssa_admin";
  school_short_name: string | null;
};

type SearchedUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  school_name: string | null;
  school_short_name: string | null;
  school_email: string | null;
  cssa_status: string | null;
  created_at: string;
};

type VerifiedUser = {
  verification_id: string;
  student_id: string;
  student_email: string;
  school_short_name: string;
  status: "verified" | "revoked";
  verified_by: string;
  verified_by_email: string;
  created_at: string;
  updated_at: string;
};

function getRoleLabel(role: string) {
  if (role === "super_admin") {
    return "Super Admin";
  }

  return "CSA/ CSSA Admin";
}

function getScopeLabel(adminRole: AdminRole | null) {
  if (!adminRole) {
    return "无权限";
  }

  if (adminRole.role === "super_admin") {
    return "全平台";
  }

  return adminRole.school_short_name || "未指定学校";
}

function getCssaStatusLabel(status: string | null) {
  if (status === "verified") {
    return "CSA/ CSSA 已认证";
  }

  return "CSA/ CSSA 未认证";
}

function formatDate(dateString: string | null) {
  if (!dateString) return "未知时间";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [userEmail, setUserEmail] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);

  const [message, setMessage] = useState("");

  const [targetEmail, setTargetEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isVerifyingUser, setIsVerifyingUser] = useState(false);

  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [verifiedSearchEmail, setVerifiedSearchEmail] = useState("");
  const [activeVerifiedSearchEmail, setActiveVerifiedSearchEmail] = useState("");
  const [isLoadingVerifiedUsers, setIsLoadingVerifiedUsers] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      setLoading(true);
      setCheckingAuth(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setMessage(userError.message);
        setLoading(false);
        setCheckingAuth(false);
        return;
      }

      if (!user) {
        setUserEmail("");
        setAdminRole(null);
        setLoading(false);
        setCheckingAuth(false);
        return;
      }

      setUserEmail(user.email || "");

      const { data: roleData, error: roleError } = await supabase.rpc(
        "get_current_admin_role"
      );

      if (roleError) {
        console.error(roleError);
        setMessage(roleError.message);
        setAdminRole(null);
        setLoading(false);
        setCheckingAuth(false);
        return;
      }

      const role = Array.isArray(roleData) ? roleData[0] : null;

      if (!role) {
        setAdminRole(null);
        setLoading(false);
        setCheckingAuth(false);
        return;
      }

      setAdminRole({
        role: role.role,
        school_short_name: role.school_short_name,
      });

      setLoading(false);
      setCheckingAuth(false);

      await loadVerifiedUsers("");
    }

    loadAdmin();
  }, [supabase]);

  async function loadVerifiedUsers(searchEmail: string) {
    setIsLoadingVerifiedUsers(true);

    const { data, error } = await supabase.rpc("admin_list_verified_users", {
      search_email: searchEmail.trim(),
    });

    setIsLoadingVerifiedUsers(false);

    if (error) {
      console.error(error);
      setMessage(`读取已认证用户失败：${error.message}`);
      return;
    }

    const activeVerifiedUsers = ((data || []) as VerifiedUser[]).filter(
      (item) => item.status === "verified"
    );

    setVerifiedUsers(activeVerifiedUsers);
  }

  async function handleSearchVerifiedUsers() {
    const trimmedEmail = verifiedSearchEmail.trim();

    setMessage("");
    setActiveVerifiedSearchEmail(trimmedEmail);

    await loadVerifiedUsers(trimmedEmail);
  }

  async function handleClearVerifiedSearch() {
    setVerifiedSearchEmail("");
    setActiveVerifiedSearchEmail("");
    setMessage("");

    await loadVerifiedUsers("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleSearchUser() {
    const trimmedEmail = targetEmail.trim();

    if (!trimmedEmail) {
      setMessage("请输入学生注册邮箱。");
      return;
    }

    setMessage("");
    setSearchedUser(null);
    setIsSearchingUser(true);

    const { data, error } = await supabase.rpc("admin_search_user_by_email", {
      target_email: trimmedEmail,
    });

    setIsSearchingUser(false);

    if (error) {
      console.error(error);
      setMessage(`查询失败：${error.message}`);
      return;
    }

    const user = Array.isArray(data) ? data[0] : null;

    if (!user) {
      setMessage("没有找到这个账号，或者你没有权限查看这个学校的用户。");
      return;
    }

    setSearchedUser(user as SearchedUser);
    setMessage("已找到用户。");
  }

  async function handleVerifyUser() {
    const trimmedEmail = targetEmail.trim();

    if (!trimmedEmail) {
      setMessage("请输入学生注册邮箱。");
      return;
    }

    setMessage("");
    setIsVerifyingUser(true);

    const { data, error } = await supabase.rpc("admin_verify_user_by_email", {
      target_email: trimmedEmail,
    });

    setIsVerifyingUser(false);

    if (error) {
      console.error(error);
      setMessage(`认证失败：${error.message}`);
      return;
    }

    const result = Array.isArray(data) ? data[0] : null;

    if (!result) {
      setMessage("认证失败：没有返回结果。");
      return;
    }

    setMessage(result.message || "操作完成。");

    if (result.success) {
      setSearchedUser((currentUser) => {
        if (!currentUser) return currentUser;

        return {
          ...currentUser,
          cssa_status: "verified",
        };
      });

      await loadVerifiedUsers(activeVerifiedSearchEmail);
    }
  }

  async function handleRevokeVerification(studentId: string) {
    const confirmed = window.confirm("确定要取消这个用户的 CSA/ CSSA 认证吗？");

    if (!confirmed) {
      return;
    }

    setMessage("");
    setRevokingUserId(studentId);

    const { data, error } = await supabase.rpc(
      "admin_revoke_user_verification",
      {
        target_user_id: studentId,
      }
    );

    setRevokingUserId(null);

    if (error) {
      console.error(error);
      setMessage(`取消认证失败：${error.message}`);
      return;
    }

    const result = Array.isArray(data) ? data[0] : null;

    if (!result) {
      setMessage("取消认证失败：没有返回结果。");
      return;
    }

    setMessage(result.message || "操作完成。");

    if (result.success) {
      setVerifiedUsers((currentUsers) =>
        currentUsers.filter((user) => user.student_id !== studentId)
      );

      setSearchedUser((currentUser) => {
        if (!currentUser) return currentUser;

        if (currentUser.user_id !== studentId) return currentUser;

        return {
          ...currentUser,
          cssa_status: "unverified",
        };
      });
    }
  }

  if (loading || checkingAuth) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-6xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market Admin
            </Link>
          </nav>

          <div className="mt-20 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8">
            <p className="text-neutral-400">正在检查管理员权限...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-5xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market Admin
            </Link>
          </nav>

          <div className="mt-20 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8">
            <p className="text-sm text-neutral-400">Admin</p>

            <h1 className="mt-3 text-3xl font-bold">请先登录管理员账号</h1>

            <p className="mt-4 text-neutral-400">
              管理后台只允许 Super Admin 或 CSSA Admin 访问。
            </p>

            <Link
              href="/login"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
            >
              去登录
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!adminRole) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-5xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market Admin
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-neutral-400 hover:text-white"
            >
              退出
            </button>
          </nav>

          <div className="mt-20 rounded-3xl border border-red-900 bg-red-950/30 p-8">
            <p className="text-sm text-red-300">无权限</p>

            <h1 className="mt-3 text-3xl font-bold">你不是管理员</h1>

            <p className="mt-4 text-neutral-400">
              当前登录账号是 {userEmail}，但没有 admin_roles 权限。
            </p>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-8 rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
            >
              退出并重新登录
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <nav className="flex items-center justify-between">
          <Link href="/admin" className="text-xl font-bold">
            Campus Market Admin
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-neutral-400 hover:text-white"
          >
            退出
          </button>
        </nav>

        <header className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
          <p className="text-sm text-neutral-400">Admin Dashboard</p>

          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">CSA/ CSSA 认证管理</h1>

              <p className="mt-3 text-neutral-400">当前登录：{userEmail}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-5 py-4">
                <p className="text-xs text-neutral-500">权限</p>

                <p className="mt-1 font-semibold">
                  {getRoleLabel(adminRole.role)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-5 py-4">
                <p className="text-xs text-neutral-500">管理范围</p>

                <p className="mt-1 font-semibold">{getScopeLabel(adminRole)}</p>
              </div>
            </div>
          </div>
        </header>

        {message && (
          <div className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
            <p className="text-sm text-neutral-300">{message}</p>
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-400">认证学生</p>

            <h2 className="mt-3 text-2xl font-bold">输入学生注册邮箱</h2>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              系统会检查这个邮箱是否存在账号，并根据你的权限判断是否可以认证。
            </p>

            <div className="mt-6">
              <input
                value={targetEmail}
                onChange={(event) => setTargetEmail(event.target.value)}
                placeholder="例如 student@nyu.edu"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleSearchUser}
                  disabled={isSearchingUser}
                  className="rounded-full border border-neutral-700 px-5 py-3 font-medium text-white hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSearchingUser ? "检查中..." : "检查账号"}
                </button>

                <button
                  type="button"
                  onClick={handleVerifyUser}
                  disabled={isVerifyingUser}
                  className="rounded-full bg-white px-5 py-3 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingUser ? "认证中..." : "CSA/ CSSA 认证"}
                </button>
              </div>
            </div>

            {searchedUser && (
              <div className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-950 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">用户邮箱</p>

                    <h3 className="mt-1 break-all text-xl font-bold">
                      {searchedUser.email}
                    </h3>

                    <p className="mt-3 text-sm text-neutral-400">
                      {searchedUser.display_name || "未设置昵称"}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      {searchedUser.school_short_name ||
                        searchedUser.school_name ||
                        "学校未填写"}
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                    {getCssaStatusLabel(searchedUser.cssa_status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/admin/users/${searchedUser.user_id}`}
                    className="rounded-full border border-neutral-700 px-4 py-2 text-center text-sm font-medium text-white hover:border-neutral-400"
                  >
                    查看用户主页
                  </Link>

                  {searchedUser.cssa_status === "verified" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRevokeVerification(searchedUser.user_id)
                      }
                      disabled={revokingUserId === searchedUser.user_id}
                      className="rounded-full border border-red-900/70 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revokingUserId === searchedUser.user_id
                        ? "取消中..."
                        : "取消认证"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-400">已认证用户</p>

                <h2 className="mt-3 text-2xl font-bold">认证列表</h2>
              </div>

              <button
                type="button"
                onClick={() => loadVerifiedUsers(activeVerifiedSearchEmail)}
                disabled={isLoadingVerifiedUsers}
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingVerifiedUsers ? "刷新中..." : "刷新"}
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSearchVerifiedUsers();
              }}
              className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <label className="text-sm text-neutral-400">搜索认证邮箱</label>

              <input
                value={verifiedSearchEmail}
                onChange={(event) =>
                  setVerifiedSearchEmail(event.target.value)
                }
                placeholder="输入邮箱关键词，例如 nyu 或 student@"
                className="mt-3 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={isLoadingVerifiedUsers}
                  className="rounded-full bg-white px-5 py-3 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  搜索
                </button>

                <button
                  type="button"
                  onClick={handleClearVerifiedSearch}
                  disabled={isLoadingVerifiedUsers}
                  className="rounded-full border border-neutral-700 px-5 py-3 font-medium text-white hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  清空
                </button>
              </div>

              {activeVerifiedSearchEmail && (
                <p className="mt-3 text-xs text-neutral-500">
                  当前筛选：{activeVerifiedSearchEmail}
                </p>
              )}
            </form>

            <div className="mt-6 space-y-3">
              {isLoadingVerifiedUsers ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                  <p className="text-sm text-neutral-400">
                    正在读取已认证用户...
                  </p>
                </div>
              ) : verifiedUsers.length === 0 ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                  <p className="text-sm text-neutral-400">
                    {activeVerifiedSearchEmail
                      ? "没有找到匹配的已认证用户。"
                      : "目前还没有已认证用户。"}
                  </p>
                </div>
              ) : (
                verifiedUsers.map((user) => (
                  <div
                    key={user.verification_id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="break-all font-semibold">
                          {user.student_email}
                        </p>

                        <p className="mt-2 text-sm text-neutral-400">
                          {user.school_short_name} ·{" "}
                          {formatDate(user.updated_at)}
                        </p>

                        <p className="mt-1 break-all text-xs text-neutral-600">
                          by {user.verified_by_email}
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-green-900/70 bg-green-950/30 px-3 py-1 text-xs text-green-300">
                        CSA/ CSSA 已认证
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Link
                        href={`/admin/users/${user.student_id}`}
                        className="rounded-full border border-neutral-700 px-4 py-2 text-center text-sm font-medium text-white hover:border-neutral-400"
                      >
                        查看用户主页
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          handleRevokeVerification(user.student_id)
                        }
                        disabled={revokingUserId === user.student_id}
                        className="rounded-full border border-red-900/70 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {revokingUserId === user.student_id
                          ? "取消中..."
                          : "取消认证"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}