"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuthNav from "@/app/components/AuthNav";
import { createClient } from "@/lib/supabase/client";

type HousingPost = {
  id: string;
  owner_id: string;
  post_type: "offer" | "request";
  title: string;
  rent_label: string;
  rent_value: number;
  school_name: string;
  school_short_name: string;
  location: string;
  housing_type: string;
  start_date: string | null;
  end_date: string | null;
  furnished: string | null;
  utilities: string | null;
  roommate: string | null;
  address: string | null;
  description: string | null;
  search_tags: string[];
  related_tags: string[];
  image_urls: string[];
  status: string;
  created_at: string;
  contact_wechat: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_snapshot_at: string | null;
};

type SellerProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  school_name: string | null;
  school_short_name: string | null;
  cssa_status: string | null;
  wechat: string | null;
  phone: string | null;
  contact_email: string | null;
  created_at: string | null;
};

type ContactInfo = {
  wechat: string | null;
  phone: string | null;
  email: string | null;
  source: "snapshot" | "profile" | "none";
};

function formatFullDate(value: string | null) {
  if (!value) return "日期待沟通";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "日期待沟通";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCreatedDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getContactInfo(
  post: HousingPost | null,
  sellerProfile: SellerProfile | null
): ContactInfo {
  if (!post) {
    return {
      wechat: null,
      phone: null,
      email: null,
      source: "none",
    };
  }

  const snapshotWechat = post.contact_wechat?.trim() || null;
  const snapshotPhone = post.contact_phone?.trim() || null;
  const snapshotEmail = post.contact_email?.trim() || null;

  if (snapshotWechat || snapshotPhone || snapshotEmail) {
    return {
      wechat: snapshotWechat,
      phone: snapshotPhone,
      email: snapshotEmail,
      source: "snapshot",
    };
  }

  const profileWechat = sellerProfile?.wechat?.trim() || null;
  const profilePhone = sellerProfile?.phone?.trim() || null;
  const profileEmail = sellerProfile?.contact_email?.trim() || null;

  if (profileWechat || profilePhone || profileEmail) {
    return {
      wechat: profileWechat,
      phone: profilePhone,
      email: profileEmail,
      source: "profile",
    };
  }

  return {
    wechat: null,
    phone: null,
    email: null,
    source: "none",
  };
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-sm text-neutral-200">
        {value || "未填写"}
      </p>
    </div>
  );
}

function ContactCard({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function HousingDetailPage() {
  const params = useParams<{ id: string }>();
  const housingId = params.id;

  const supabase = useMemo(() => createClient(), []);

  const [post, setPost] = useState<HousingPost | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(
    null
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const contactInfo = getContactInfo(post, sellerProfile);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setMessage("");

      const { data: postData, error: postError } = await supabase
        .from("housing_posts")
        .select("*")
        .eq("id", housingId)
        .single();

      if (postError) {
        console.error(postError);
        setMessage("这个房源帖子不存在，或者已经被删除。");
        setLoading(false);
        return;
      }

      setPost(postData as HousingPost);

      if (postData?.owner_id) {
        const { data: profileData, error: profileError } = await supabase
          .from("public_profiles")
          .select(
            "id, display_name, bio, school_name, school_short_name, cssa_status, wechat, phone, contact_email, created_at"
          )
          .eq("id", postData.owner_id)
          .single();

        if (profileError) {
          console.error(profileError);
        } else {
          setSellerProfile(profileData as SellerProfile);
        }
      }

      setLoading(false);
    }

    if (housingId) {
      loadPage();
    }
  }, [housingId, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market
            </Link>

            <AuthNav />
          </nav>

          <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
            <h1 className="text-2xl font-bold">正在读取房源...</h1>

            <p className="mt-3 text-neutral-400">
              正在从 Supabase 读取 housing_posts 详情。
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!post || message) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market
            </Link>

            <AuthNav />
          </nav>

          <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
            <h1 className="text-2xl font-bold">没有找到这个帖子</h1>

            <p className="mt-3 text-neutral-400">
              {message || "它可能已经被删除。"}
            </p>

            <Link
              href="/housing"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
            >
              返回房源列表
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const isRequest = post.post_type === "request";
  const imageUrls = post.image_urls || [];
  const selectedImage = imageUrls[selectedImageIndex];

  const tags = Array.from(
    new Set([...(post.related_tags || []), ...(post.search_tags || [])])
  ).slice(0, 18);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Campus Market
          </Link>

          <div className="flex items-center gap-5">
            <Link
              href="/housing"
              className="text-sm text-neutral-400 hover:text-white"
            >
              返回房源列表
            </Link>

            <AuthNav />
          </div>
        </nav>

        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                isRequest
                  ? "border-sky-700 bg-sky-950/50 text-sky-300"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300"
              }`}
            >
              {isRequest ? "求租" : "房源"}
            </span>

            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
              {post.school_short_name}
            </span>

            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
              {post.housing_type}
            </span>

            <span className="text-xs text-neutral-500">
              发布于 {formatCreatedDate(post.created_at)}
            </span>
          </div>

          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/40">
                <div className="flex h-[460px] items-center justify-center bg-neutral-900">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                      {isRequest ? "求租需求" : "暂无房源图片"}
                    </div>
                  )}
                </div>

                {imageUrls.length > 1 && (
                  <div className="grid grid-cols-4 gap-3 border-t border-neutral-800 p-4 sm:grid-cols-6">
                    {imageUrls.map((imageUrl, index) => (
                      <button
                        key={imageUrl}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`h-20 overflow-hidden rounded-2xl border ${
                          selectedImageIndex === index
                            ? "border-white"
                            : "border-neutral-800 hover:border-neutral-500"
                        }`}
                      >
                        <img
                          src={imageUrl}
                          alt={`${post.title} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
                <h2 className="text-xl font-semibold">
                  {isRequest ? "求租描述" : "房源描述"}
                </h2>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-300">
                  {post.description || "暂无描述"}
                </p>
              </section>

              <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold">标签</h2>

                  <p className="text-xs text-neutral-500">
                    标签用于搜索和匹配
                  </p>
                </div>

                {tags.length === 0 ? (
                  <p className="mt-4 text-sm text-neutral-500">暂无标签</p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
              <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
                <h1 className="text-3xl font-bold leading-tight">
                  {post.title}
                </h1>

                <p className="mt-4 text-4xl font-bold">
                  {post.rent_label || `$${post.rent_value}/月`}
                </p>

                <div className="mt-6 grid gap-3">
                  <InfoCard label="学校" value={post.school_name} />

                  <InfoCard label="位置" value={post.location} />

                  <InfoCard label="房型" value={post.housing_type} />

                  <InfoCard
                    label={isRequest ? "期望租期" : "可租日期"}
                    value={`${formatFullDate(post.start_date)} - ${formatFullDate(
                      post.end_date
                    )}`}
                  />

                  <InfoCard
                    label={isRequest ? "家具偏好" : "家具情况"}
                    value={post.furnished}
                  />

                  <InfoCard
                    label={isRequest ? "水电网偏好" : "水电网"}
                    value={post.utilities}
                  />

                  <InfoCard
                    label={isRequest ? "室友偏好" : "室友情况"}
                    value={post.roommate}
                  />

                  {!isRequest && (
                    <InfoCard label="具体地址" value={post.address} />
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold">
                    {isRequest ? "联系求租者" : "联系发布者"}
                  </h2>

                  {sellerProfile?.cssa_status === "verified" && (
                    <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300">
                      CSSA 已认证
                    </span>
                  )}
                </div>

                {contactInfo.source === "none" ? (
                  <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-sm leading-6 text-neutral-400">
                      这个帖子没有留下可公开联系方式。
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <ContactCard label="微信" value={contactInfo.wechat} />
                    <ContactCard label="手机号" value={contactInfo.phone} />
                    <ContactCard label="邮箱" value={contactInfo.email} />

                    {contactInfo.source === "snapshot" && (
                      <p className="text-xs leading-5 text-neutral-600">
                        这是发布者发帖时留下的联系方式。即使之后修改个人主页设置，这个帖子仍保留当时的联系方式。
                      </p>
                    )}

                    {contactInfo.source === "profile" && (
                      <p className="text-xs leading-5 text-neutral-600">
                        这个旧帖子没有联系方式快照，所以暂时显示发布者当前公开的联系方式。
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
                <h2 className="text-xl font-semibold">发布者</h2>

                {sellerProfile ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {sellerProfile.display_name || "未设置昵称"}
                        </p>

                        <p className="mt-1 text-sm text-neutral-400">
                          {sellerProfile.school_short_name || "学校未知"}
                        </p>
                      </div>

                      {sellerProfile.cssa_status === "verified" ? (
                        <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300">
                          已认证
                        </span>
                      ) : (
                        <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">
                          未认证
                        </span>
                      )}
                    </div>

                    {sellerProfile.bio && (
                      <p className="mt-4 text-sm leading-6 text-neutral-400">
                        {sellerProfile.bio}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-neutral-500">
                    暂时无法读取发布者主页信息，但联系方式已按帖子公开信息展示。
                  </p>
                )}
              </section>
            </aside>
          </div>
        </section>
      </section>
    </main>
  );
}