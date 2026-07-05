"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileForm = {
  display_name: string;
  bio: string;
  school_name: string;
  school_short_name: string;
  school_email: string;
  wechat: string;
  phone: string;
  contact_email: string;
  show_wechat: boolean;
  show_phone: boolean;
  show_email: boolean;
};

const emptyForm: ProfileForm = {
  display_name: "",
  bio: "",
  school_name: "",
  school_short_name: "",
  school_email: "",
  wechat: "",
  phone: "",
  contact_email: "",
  show_wechat: false,
  show_phone: false,
  show_email: false,
};

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setAuthEmail(user.email || "");

      const schoolFromAuth =
        typeof user.user_metadata?.school === "string"
          ? user.user_metadata.school
          : "";

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (profile) {
        setForm({
          display_name: profile.display_name || "",
          bio: profile.bio || "",
          school_name: profile.school_name || "",
          school_short_name: profile.school_short_name || "",
          school_email: profile.school_email || user.email || "",
          wechat: profile.wechat || "",
          phone: profile.phone || "",
          contact_email: profile.contact_email || user.email || "",
          show_wechat: Boolean(profile.show_wechat),
          show_phone: Boolean(profile.show_phone),
          show_email: Boolean(profile.show_email),
        });
      } else {
        setForm({
          ...emptyForm,
          school_short_name: schoolFromAuth,
          school_email: user.email || "",
          contact_email: user.email || "",
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  function updateField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage("");
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setErrorMessage("没有找到当前用户，请重新登录。");
      return;
    }

    if (!form.display_name.trim()) {
      setErrorMessage("请填写昵称或姓名。");
      return;
    }

    if (!form.school_email.trim()) {
      setErrorMessage("请填写学校邮箱。");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("profiles").upsert({
      id: userId,

      display_name: form.display_name.trim(),
      bio: form.bio.trim(),

      school_name: form.school_name.trim(),
      school_short_name: form.school_short_name.trim(),
      school_email: form.school_email.trim(),

      wechat: form.wechat.trim(),
      phone: form.phone.trim(),
      contact_email: form.contact_email.trim(),

      show_wechat: form.show_wechat,
      show_phone: form.show_phone,
      show_email: form.show_email,

      updated_at: new Date().toISOString(),
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("个人资料已保存。");
    setSaving(false);

    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <p className="text-neutral-400">正在加载个人资料...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Campus Market
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/profile"
              className="text-sm text-neutral-300 hover:text-white"
            >
              返回个人主页
            </Link>

            <Link
              href="/listings"
              className="text-sm text-neutral-300 hover:text-white"
            >
              二手商品
            </Link>

            <Link
              href="/housing"
              className="text-sm text-neutral-300 hover:text-white"
            >
              短租房源
            </Link>
          </div>
        </nav>

        <header className="mt-10">
          <p className="text-sm text-neutral-400">编辑个人资料</p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            设置你的公开资料。
          </h1>

          <p className="mt-4 max-w-2xl text-neutral-400">
            你可以填写联系方式，并选择哪些信息展示给其他用户。
            I-20 文件和认证材料不会展示给其他用户。
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6"
        >
          <section>
            <h2 className="text-2xl font-bold">基本信息</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm text-neutral-300">昵称 / 姓名</label>

                <input
                  value={form.display_name}
                  onChange={(event) =>
                    updateField("display_name", event.target.value)
                  }
                  placeholder="例如：Gary"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-300">学校邮箱</label>

                <input
                  value={form.school_email}
                  onChange={(event) =>
                    updateField("school_email", event.target.value)
                  }
                  placeholder="name@school.edu"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />

                <p className="mt-2 text-xs text-neutral-500">
                  当前登录邮箱：{authEmail || "未知"}
                </p>
              </div>

              <div>
                <label className="text-sm text-neutral-300">学校全名</label>

                <input
                  value={form.school_name}
                  onChange={(event) =>
                    updateField("school_name", event.target.value)
                  }
                  placeholder="例如：Carnegie Mellon University"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-300">学校缩写</label>

                <input
                  value={form.school_short_name}
                  onChange={(event) =>
                    updateField("school_short_name", event.target.value)
                  }
                  placeholder="例如：CMU"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm text-neutral-300">个人简介</label>

              <textarea
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                placeholder="例如：CMU MSBA 学生，正在出售一些搬家闲置。"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </div>
          </section>

          <section className="mt-10 border-t border-neutral-800 pt-8">
            <h2 className="text-2xl font-bold">联系方式</h2>

            <p className="mt-3 text-sm text-neutral-500">
              这些联系方式是否展示给其他用户，由下面的公开开关决定。
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div>
                <label className="text-sm text-neutral-300">微信号</label>

                <input
                  value={form.wechat}
                  onChange={(event) =>
                    updateField("wechat", event.target.value)
                  }
                  placeholder="WeChat ID"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-300">电话</label>

                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="Phone number"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-300">展示邮箱</label>

                <input
                  value={form.contact_email}
                  onChange={(event) =>
                    updateField("contact_email", event.target.value)
                  }
                  placeholder="Contact email"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <span>
                  <span className="block font-medium">公开微信号</span>
                  <span className="mt-1 block text-xs text-neutral-500">
                    公开主页展示微信
                  </span>
                </span>

                <input
                  checked={form.show_wechat}
                  onChange={(event) =>
                    updateField("show_wechat", event.target.checked)
                  }
                  type="checkbox"
                  className="h-5 w-5"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <span>
                  <span className="block font-medium">公开电话</span>
                  <span className="mt-1 block text-xs text-neutral-500">
                    公开主页展示电话
                  </span>
                </span>

                <input
                  checked={form.show_phone}
                  onChange={(event) =>
                    updateField("show_phone", event.target.checked)
                  }
                  type="checkbox"
                  className="h-5 w-5"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <span>
                  <span className="block font-medium">公开邮箱</span>
                  <span className="mt-1 block text-xs text-neutral-500">
                    公开主页展示邮箱
                  </span>
                </span>

                <input
                  checked={form.show_email}
                  onChange={(event) =>
                    updateField("show_email", event.target.checked)
                  }
                  type="checkbox"
                  className="h-5 w-5"
                />
              </label>
            </div>
          </section>

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-2xl border border-green-900/60 bg-green-950/30 p-4 text-sm text-green-200">
              {message}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 md:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存个人资料"}
            </button>

            <Link
              href="/profile"
              className="rounded-2xl border border-neutral-700 px-6 py-3 text-center font-medium text-white hover:border-neutral-400"
            >
              返回个人主页
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}