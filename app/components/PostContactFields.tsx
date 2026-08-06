"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PostContactSnapshot = {
  contact_wechat: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  deleteCode: string;
};

export function readPostContactFields(
  form: HTMLFormElement
): PostContactSnapshot {
  const data = new FormData(form);

  function selectedValue(field: string, checkbox: string) {
    if (data.get(checkbox) !== "on") return null;
    const value = String(data.get(field) || "").trim();
    return value || null;
  }

  return {
    contact_wechat: selectedValue("contact_wechat", "use_contact_wechat"),
    contact_phone: selectedValue("contact_phone", "use_contact_phone"),
    contact_email: selectedValue("contact_email", "use_contact_email"),
    deleteCode: String(data.get("delete_code") || "").trim(),
  };
}

export function hasSelectedContact(snapshot: PostContactSnapshot) {
  return Boolean(
    snapshot.contact_wechat || snapshot.contact_phone || snapshot.contact_email
  );
}

export default function PostContactFields() {
  const supabase = useMemo(() => createClient(), []);
  const [wechat, setWechat] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [useWechat, setUseWechat] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");

  useEffect(() => {
    async function loadSavedContacts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("wechat, phone, contact_email")
        .eq("id", user.id)
        .maybeSingle();

      const savedWechat = String(data?.wechat || "").trim();
      const savedPhone = String(data?.phone || "").trim();
      const savedEmail = String(data?.contact_email || user.email || "").trim();

      setWechat(savedWechat);
      setPhone(savedPhone);
      setEmail(savedEmail);
      setUseWechat(Boolean(savedWechat));
      setUsePhone(Boolean(savedPhone));
      setUseEmail(Boolean(savedEmail));
    }

    loadSavedContacts();
  }, [supabase]);

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
      <h2 className="text-xl font-semibold">联系方式和删除码</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-400">
        已登录时会自动填充个人主页保存的联系方式。本次发布至少勾选并填写一种联系方式。
      </p>

      <div className="mt-6 space-y-4">
        <ContactRow
          label="微信"
          name="contact_wechat"
          checkboxName="use_contact_wechat"
          value={wechat}
          checked={useWechat}
          onValueChange={(value) => {
            setWechat(value);
            if (!value.trim()) setUseWechat(false);
          }}
          onCheckedChange={setUseWechat}
          placeholder="微信号"
        />
        <ContactRow
          label="手机号"
          name="contact_phone"
          checkboxName="use_contact_phone"
          value={phone}
          checked={usePhone}
          onValueChange={(value) => {
            setPhone(value);
            if (!value.trim()) setUsePhone(false);
          }}
          onCheckedChange={setUsePhone}
          placeholder="手机号"
        />
        <ContactRow
          label="邮箱"
          name="contact_email"
          checkboxName="use_contact_email"
          value={email}
          checked={useEmail}
          onValueChange={(value) => {
            setEmail(value);
            if (!value.trim()) setUseEmail(false);
          }}
          onCheckedChange={setUseEmail}
          placeholder="联系邮箱"
          type="email"
        />
      </div>

      <div className="mt-6">
        <label className="text-sm text-neutral-300">四位数字删除码</label>
        <input
          name="delete_code"
          value={deleteCode}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
            setDeleteCode(digits);
          }}
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{4}"
          maxLength={4}
          placeholder="例如：4826"
          className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
        />
        <p className="mt-2 text-xs text-amber-300/80">
          删除码无法找回。发布成功后请立即保存；任何知道删除码的人都能删除帖子。
        </p>
      </div>
    </section>
  );
}

function ContactRow({
  label,
  name,
  checkboxName,
  value,
  checked,
  onValueChange,
  onCheckedChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  checkboxName: string;
  value: string;
  checked: boolean;
  onValueChange: (value: string) => void;
  onCheckedChange: (checked: boolean) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <label className="text-sm text-neutral-400">{label}</label>
        <input
          type={type}
          name={name}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
        />
      </div>
      <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm text-neutral-300">
        <input
          type="checkbox"
          name={checkboxName}
          checked={checked}
          disabled={!value.trim()}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="h-4 w-4 disabled:cursor-not-allowed disabled:opacity-40"
        />
        本帖公开
      </label>
    </div>
  );
}
