"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SchoolCssaInfo = {
  school_short_name: string;
  school_name: string;
  cssa_contact_email: string | null;
};

type CssaVerificationNoticeProps = {
  schoolShortName: string | null | undefined;
  cssaStatus: string | null | undefined;
};

const FALLBACK_EMAIL = "gary_guoyili@outlook.com";

function getStatusText(status: string | null | undefined) {
  if (status === "verified") return "你已经完成 CSSA 认证。";
  if (status === "pending") return "你的 CSSA 认证正在等待处理。";
  if (status === "rejected") return "你的 CSSA 认证未通过，可以重新联系认证邮箱。";
  if (status === "revoked") return "你的 CSSA 认证已被取消，可以重新联系认证邮箱。";

  return "你还没有完成 CSSA 认证。";
}

export default function CssaVerificationNotice({
  schoolShortName,
  cssaStatus,
}: CssaVerificationNoticeProps) {
  const supabase = useMemo(() => createClient(), []);

  const [schoolInfo, setSchoolInfo] = useState<SchoolCssaInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSchoolInfo() {
      if (!schoolShortName) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("schools")
        .select("school_short_name, school_name, cssa_contact_email")
        .eq("school_short_name", schoolShortName)
        .eq("is_active", true)
        .single();

      setLoading(false);

      if (error) {
        console.error(error);
        setSchoolInfo(null);
        return;
      }

      setSchoolInfo(data as SchoolCssaInfo);
    }

    loadSchoolInfo();
  }, [schoolShortName, supabase]);

  const contactEmail =
    schoolInfo?.cssa_contact_email?.trim() || FALLBACK_EMAIL;

  const hasSchoolCssaEmail = Boolean(schoolInfo?.cssa_contact_email?.trim());

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-neutral-400">CSSA 认证</p>

          <h2 className="mt-2 text-xl font-semibold">
            {getStatusText(cssaStatus)}
          </h2>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs ${
            cssaStatus === "verified"
              ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
              : "border-neutral-800 bg-neutral-950 text-neutral-400"
          }`}
        >
          {cssaStatus === "verified" ? "已认证" : "未认证"}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        {loading ? (
          <p className="text-sm text-neutral-400">正在读取认证邮箱...</p>
        ) : (
          <>
            <p className="text-sm leading-7 text-neutral-300">
              如需 CSSA 认证，请发送邮件至：
            </p>

            <p className="mt-2 break-all text-lg font-semibold text-white">
              {contactEmail}
            </p>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              邮件标题请写：
              <span className="font-medium text-neutral-200">
                Campus Market CSSA认证
              </span>
              。邮件中请附上你的 Campus Market 注册邮箱，以及能证明学生身份的材料。
            </p>

            {!hasSchoolCssaEmail && (
              <p className="mt-4 text-xs leading-6 text-neutral-600">
                当前学校暂未配置单独的 CSSA 认证邮箱，所以暂时使用平台联系邮箱。
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}