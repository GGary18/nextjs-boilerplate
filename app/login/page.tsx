"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type SchoolOption = {
  school_short_name: string;
  school_name: string;
  email_domains: string[];
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function emailMatchesSchool(email: string, school: SchoolOption | null) {
  if (!school) return false;

  const normalizedEmail = normalizeText(email);

  return school.email_domains.some((domain) =>
    normalizedEmail.endsWith(`@${normalizeText(domain)}`)
  );
}

function getSchoolScore(school: SchoolOption, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return 0;

  const shortName = normalizeText(school.school_short_name);
  const fullName = normalizeText(school.school_name);
  const domains = school.email_domains.map(normalizeText);

  if (shortName === normalizedQuery) return 100;
  if (shortName.startsWith(normalizedQuery)) return 90;
  if (fullName.includes(normalizedQuery)) return 70;
  if (domains.some((domain) => domain.includes(normalizedQuery))) return 60;

  return 0;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<AuthMode>("login");

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(
    null
  );

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSchools() {
      setSchoolLoading(true);

      const { data, error } = await supabase
        .from("schools")
        .select("school_short_name, school_name, email_domains")
        .eq("is_active", true)
        .order("school_short_name", { ascending: true });

      setSchoolLoading(false);

      if (error) {
        console.error(error);
        setMessage(`读取学校列表失败：${error.message}`);
        return;
      }

      setSchools((data || []) as SchoolOption[]);
    }

    loadSchools();
  }, [supabase]);

  const schoolSearchResults = useMemo(() => {
    const normalizedQuery = normalizeText(schoolQuery);

    if (!normalizedQuery) return [];

    return schools
      .map((school) => ({
        school,
        score: getSchoolScore(school, normalizedQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => item.school);
  }, [schools, schoolQuery]);

  async function redirectAfterLogin() {
    const { data: adminRoleData, error: adminRoleError } = await supabase.rpc(
      "get_current_admin_role"
    );

    if (!adminRoleError && Array.isArray(adminRoleData) && adminRoleData[0]) {
      router.push("/admin");
      router.refresh();
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!loginEmail.trim()) {
      setMessage("请填写邮箱。");
      return;
    }

    if (!loginPassword) {
      setMessage("请填写密码。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage(`登录失败：${error.message}`);
      return;
    }

    await redirectAfterLogin();
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!signupName.trim()) {
      setMessage("请填写昵称。");
      return;
    }

    if (!selectedSchool) {
      setMessage("请输入学校简称或全名，并从搜索结果里选择学校。");
      return;
    }

    if (!signupEmail.trim()) {
      setMessage("请填写学校邮箱。");
      return;
    }

    if (!emailMatchesSchool(signupEmail, selectedSchool)) {
      setMessage(
        `邮箱后缀和所选学校不匹配。${selectedSchool.school_short_name} 支持的后缀是：${selectedSchool.email_domains.join(
          ", "
        )}`
      );
      return;
    }

    if (signupPassword.length < 6) {
      setMessage("密码至少需要 6 位。");
      return;
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/confirmed`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: signupName.trim(),
          school_name: selectedSchool.school_name,
          school_short_name: selectedSchool.school_short_name,
          school_email: signupEmail.trim(),
        },
      },
    });

    if (error) {
      console.error(error);
      setLoading(false);
      setMessage(`注册失败：${error.message}`);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: signupName.trim(),
        school_name: selectedSchool.school_name,
        school_short_name: selectedSchool.school_short_name,
        school_email: signupEmail.trim(),
        contact_email: signupEmail.trim(),
        show_email: true,
        cssa_status: "unverified",
      });

      if (profileError) {
        console.error(profileError);
        setLoading(false);
        setMessage(`账号已创建，但写入个人资料失败：${profileError.message}`);
        return;
      }
    }

    setLoading(false);
    setMode("login");
    setLoginEmail(signupEmail.trim());
    setLoginPassword("");

    setMessage(
      "注册成功。请前往学校邮箱点击确认邮件，确认后再登录 Campus Market。"
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Campus Market
          </Link>

          <Link href="/" className="text-sm text-neutral-400 hover:text-white">
            返回首页
          </Link>
        </nav>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm text-neutral-400">学生二手与短租平台</p>

            <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
              用学校邮箱加入 Campus Market。
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-400">
              注册后可以发布商品、发布求购、发布短租房源和求租需求。发布前需要在个人主页至少公开一种联系方式。
            </p>

            <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
              <h2 className="font-semibold">认证说明</h2>

              <p className="mt-3 text-sm leading-7 text-neutral-400">
                注册需要选择学校并使用对应学校邮箱。CSSA 认证会在个人主页显示具体联系邮箱。
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  mode === "login"
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                登录
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  mode === "signup"
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                注册
              </button>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="mt-6 space-y-5">
                <div>
                  <label className="text-sm text-neutral-400">邮箱</label>

                  <input
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="学校邮箱或管理员邮箱"
                    className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-neutral-400">密码</label>

                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="请输入密码"
                    className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "登录中..." : "登录"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="mt-6 space-y-5">
                <div>
                  <label className="text-sm text-neutral-400">昵称</label>

                  <input
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    placeholder="例如 Gary"
                    className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-neutral-400">学校</label>

                  {selectedSchool ? (
                    <div className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {selectedSchool.school_short_name}
                          </p>
                          <p className="mt-1 text-sm text-neutral-400">
                            {selectedSchool.school_name}
                          </p>
                          <p className="mt-1 text-xs text-neutral-600">
                            {selectedSchool.email_domains.join(", ")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSchool(null);
                            setSchoolQuery("");
                          }}
                          className="text-sm text-neutral-500 hover:text-white"
                        >
                          更换
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        value={schoolQuery}
                        onChange={(event) => setSchoolQuery(event.target.value)}
                        placeholder="输入学校简称或全名"
                        className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                      />

                      <div className="mt-2 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
                        {schoolLoading ? (
                          <p className="p-4 text-sm text-neutral-500">
                            正在读取学校列表...
                          </p>
                        ) : !schoolQuery.trim() ? (
                          <p className="p-4 text-sm text-neutral-500">
                            请输入学校简称或全名，然后从结果中选择。
                          </p>
                        ) : schoolSearchResults.length === 0 ? (
                          <p className="p-4 text-sm text-neutral-500">
                            暂时没有找到匹配学校。
                          </p>
                        ) : (
                          schoolSearchResults.map((school) => (
                            <button
                              key={school.school_short_name}
                              type="button"
                              onClick={() => {
                                setSelectedSchool(school);
                                setSchoolQuery("");
                              }}
                              className="block w-full border-b border-neutral-900 px-4 py-3 text-left last:border-b-0 hover:bg-neutral-900"
                            >
                              <p className="font-medium">
                                {school.school_short_name}
                              </p>
                              <p className="mt-1 text-sm text-neutral-400">
                                {school.school_name}
                              </p>
                              <p className="mt-1 text-xs text-neutral-600">
                                {school.email_domains.join(", ")}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-sm text-neutral-400">学校邮箱</label>

                  <input
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    placeholder="例如 yourname@andrew.cmu.edu"
                    className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-neutral-400">密码</label>

                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="至少 6 位"
                    className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "注册中..." : "注册并发送确认邮件"}
                </button>
              </form>
            )}

            {message && (
              <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-sm leading-6 text-neutral-300">{message}</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}