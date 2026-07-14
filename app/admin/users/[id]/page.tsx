"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminRole = {
  role: "super_admin" | "cssa_admin";
  school_short_name: string | null;
};

type AdminUserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  bio: string | null;
  school_name: string | null;
  school_short_name: string | null;
  school_email: string | null;
  cssa_status: string | null;
  wechat: string | null;
  phone: string | null;
  contact_email: string | null;
  show_wechat: boolean | null;
  show_phone: boolean | null;
  show_email: boolean | null;
  created_at: string | null;
};

type AdminPost = {
  id: string;
  source_table: "listings" | "housing_posts";
  post_type: "offer" | "request";
  title: string;
  price_label?: string | null;
  rent_label?: string | null;
  price_value?: number | null;
  rent_value?: number | null;
  school_name: string | null;
  school_short_name: string | null;
  location: string | null;
  category?: string | null;
  housing_type?: string | null;
  item_condition?: string | null;
  furnished?: string | null;
  status: string | null;
  created_at: string | null;
  image_urls?: string[] | null;
  description?: string | null;
};

type RawPost = Record<string, any>;

type FilterKey = "products" | "housing" | "requests" | "offers";

type ActiveFilters = {
  products: boolean;
  housing: boolean;
  requests: boolean;
  offers: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "未知时间";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCssaStatusText(status: string | null | undefined) {
  if (status === "verified") return "CSSA 已认证";
  if (status === "pending") return "等待认证";
  if (status === "rejected") return "认证未通过";
  if (status === "revoked") return "认证已取消";

  return "未认证";
}

function getCssaStatusClass(status: string | null | undefined) {
  if (status === "verified") {
    return "border-emerald-800 bg-emerald-950/40 text-emerald-300";
  }

  if (status === "pending") {
    return "border-yellow-800 bg-yellow-950/40 text-yellow-300";
  }

  if (status === "rejected" || status === "revoked") {
    return "border-red-900 bg-red-950/40 text-red-300";
  }

  return "border-neutral-800 bg-neutral-950 text-neutral-400";
}

function normalizeProfile(rawProfile: any): AdminUserProfile | null {
  if (!rawProfile) return null;

  const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

  if (!profile) return null;

  return {
    id: profile.id || profile.user_id || "",
    email: profile.email || profile.user_email || profile.auth_email || null,
    display_name: profile.display_name || null,
    bio: profile.bio || null,
    school_name: profile.school_name || null,
    school_short_name: profile.school_short_name || null,
    school_email: profile.school_email || null,
    cssa_status: profile.cssa_status || null,
    wechat: profile.wechat || null,
    phone: profile.phone || null,
    contact_email: profile.contact_email || null,
    show_wechat: profile.show_wechat ?? null,
    show_phone: profile.show_phone ?? null,
    show_email: profile.show_email ?? null,
    created_at: profile.created_at || null,
  };
}

function parseImageUrls(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim());
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => typeof item === "string" && item.trim()
        );
      }
    } catch {
      if (value.trim().startsWith("http")) {
        return [value.trim()];
      }
    }
  }

  return [];
}

function normalizeSinglePost(rawPost: RawPost, fallbackTable?: string): AdminPost {
  const sourceTable =
    rawPost.source_table ||
    rawPost.table_name ||
    rawPost.target_table ||
    rawPost.post_table ||
    fallbackTable ||
    (rawPost.rent_label !== undefined || rawPost.housing_type !== undefined
      ? "housing_posts"
      : "listings");

  return {
    id: rawPost.id,
    source_table:
      sourceTable === "housing_posts" ? "housing_posts" : "listings",
    post_type: rawPost.post_type || "offer",
    title: rawPost.title || "未命名帖子",
    price_label: rawPost.price_label || null,
    rent_label: rawPost.rent_label || null,
    price_value:
      rawPost.price_value === undefined || rawPost.price_value === null
        ? null
        : Number(rawPost.price_value),
    rent_value:
      rawPost.rent_value === undefined || rawPost.rent_value === null
        ? null
        : Number(rawPost.rent_value),
    school_name: rawPost.school_name || null,
    school_short_name: rawPost.school_short_name || null,
    location: rawPost.location || null,
    category: rawPost.category || null,
    housing_type: rawPost.housing_type || null,
    item_condition: rawPost.item_condition || null,
    furnished: rawPost.furnished || null,
    status: rawPost.status || null,
    created_at: rawPost.created_at || null,
    image_urls: parseImageUrls(rawPost.image_urls),
    description: rawPost.description || null,
  };
}

function normalizePosts(rawData: any): AdminPost[] {
  if (!rawData) return [];

  if (Array.isArray(rawData)) {
    return rawData.map((item) => normalizeSinglePost(item));
  }

  const possibleWrapper = Array.isArray(rawData.data) ? rawData.data : null;

  if (possibleWrapper) {
    return possibleWrapper.map((item: RawPost) => normalizeSinglePost(item));
  }

  const listings = Array.isArray(rawData.listings) ? rawData.listings : [];
  const housingPosts = Array.isArray(rawData.housing_posts)
    ? rawData.housing_posts
    : [];

  const combinedPosts = [
    ...listings.map((item: RawPost) => normalizeSinglePost(item, "listings")),
    ...housingPosts.map((item: RawPost) =>
      normalizeSinglePost(item, "housing_posts")
    ),
  ];

  if (combinedPosts.length > 0) {
    return combinedPosts;
  }

  return [];
}

function getPostTypeLabel(post: AdminPost) {
  if (post.source_table === "listings") {
    return post.post_type === "request" ? "求好物" : "商品";
  }

  return post.post_type === "request" ? "求租" : "房源";
}

function getPostAccentClass(post: AdminPost) {
  if (post.source_table === "listings" && post.post_type === "request") {
    return "border-yellow-900/60 bg-yellow-950/10";
  }

  if (post.source_table === "housing_posts" && post.post_type === "request") {
    return "border-sky-900/60 bg-sky-950/10";
  }

  return "border-neutral-800 bg-neutral-900/40";
}

function getPostPriceLabel(post: AdminPost) {
  if (post.source_table === "housing_posts") {
    return post.rent_label || `$${post.rent_value || 0}/月`;
  }

  return post.price_label || `$${post.price_value || 0}`;
}

function getPostMainTag(post: AdminPost) {
  if (post.source_table === "housing_posts") {
    return post.housing_type || "房型未填";
  }

  return post.category || "未分类";
}

function getPostSecondaryTag(post: AdminPost) {
  if (post.source_table === "housing_posts") {
    return post.furnished || "";
  }

  return post.item_condition || "";
}

function ContactRow({
  label,
  value,
  visible,
}: {
  label: string;
  value: string | null;
  visible?: boolean | null;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">{label}</p>

        {visible !== undefined && visible !== null && (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              visible
                ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                : "border-neutral-800 text-neutral-500"
            }`}
          >
            {visible ? "主页公开" : "主页隐藏"}
          </span>
        )}
      </div>

      <p className="mt-2 break-all text-sm text-neutral-200">
        {value || "未填写"}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-white bg-white text-black"
          : "border-neutral-800 text-neutral-400 hover:border-neutral-500 hover:text-white"
      }`}
    >
      {label}
      <span className="ml-2 opacity-70">{count}</span>
    </button>
  );
}

function PostCard({
  post,
  actionLoading,
  onDelete,
}: {
  post: AdminPost;
  actionLoading: boolean;
  onDelete: (post: AdminPost) => void;
}) {
  const coverImage = post.image_urls?.[0] || "";

  return (
    <article
      className={`overflow-hidden rounded-3xl border transition hover:border-neutral-600 ${getPostAccentClass(
        post
      )}`}
    >
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <div className="flex h-56 items-center justify-center bg-neutral-900 text-sm text-neutral-600 md:h-full">
          {coverImage ? (
            <img
              src={coverImage}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-800/70">
              {getPostTypeLabel(post)}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-300">
              {getPostTypeLabel(post)}
            </span>

            <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-300">
              {post.school_short_name || "学校未知"}
            </span>

            <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-300">
              {post.status || "状态未知"}
            </span>
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-xl font-semibold">
                {post.title}
              </h3>

              <p className="mt-2 text-sm text-neutral-400">
                {post.school_name || post.school_short_name || "学校未知"} ·{" "}
                {post.location || "位置未填写"}
              </p>
            </div>

            <p className="shrink-0 text-xl font-bold">
              {getPostPriceLabel(post)}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-300">
            <span className="rounded-full border border-neutral-700 px-3 py-1">
              {getPostMainTag(post)}
            </span>

            {getPostSecondaryTag(post) && (
              <span className="rounded-full border border-neutral-700 px-3 py-1">
                {getPostSecondaryTag(post)}
              </span>
            )}

            <span className="rounded-full border border-neutral-700 px-3 py-1">
              {formatDate(post.created_at)}
            </span>
          </div>

          {post.description ? (
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-500">
              {post.description}
            </p>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">暂无描述</p>
          )}

          <div className="mt-5 border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={() => onDelete(post)}
              disabled={actionLoading}
              className="rounded-full border border-red-900 px-4 py-2 text-sm text-red-300 hover:border-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? "处理中..." : "删除帖子"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const supabase = useMemo(() => createClient(), []);

  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    products: true,
    housing: true,
    requests: true,
    offers: true,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const productPosts = posts.filter((post) => post.source_table === "listings");
  const housingPosts = posts.filter(
    (post) => post.source_table === "housing_posts"
  );
  const offerPosts = posts.filter((post) => post.post_type === "offer");
  const requestPosts = posts.filter((post) => post.post_type === "request");

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const sourceMatch =
        (activeFilters.products && post.source_table === "listings") ||
        (activeFilters.housing && post.source_table === "housing_posts");

      const typeMatch =
        (activeFilters.offers && post.post_type === "offer") ||
        (activeFilters.requests && post.post_type === "request");

      return sourceMatch && typeMatch;
    });
  }, [posts, activeFilters]);

  function toggleFilter(key: FilterKey) {
    setActiveFilters((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function resetFilters() {
    setActiveFilters({
      products: true,
      housing: true,
      requests: true,
      offers: true,
    });
  }

  async function loadAdminUserPage() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      setMessage(`读取登录状态失败：${userError.message}`);
      setLoading(false);
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase.rpc(
      "get_current_admin_role"
    );

    if (roleError) {
      console.error(roleError);
      setMessage(`读取管理员权限失败：${roleError.message}`);
      setLoading(false);
      return;
    }

    const role = Array.isArray(roleData) ? roleData[0] : null;

    if (!role) {
      setMessage("你不是管理员，无法查看这个页面。");
      setLoading(false);
      return;
    }

    setAdminRole({
      role: role.role,
      school_short_name: role.school_short_name,
    });

    const { data: profileData, error: profileError } = await supabase.rpc(
      "admin_get_user_profile",
      {
        target_user_id: userId,
      }
    );

    if (profileError) {
      console.error(profileError);
      setMessage(`读取用户资料失败：${profileError.message}`);
      setLoading(false);
      return;
    }

    const normalizedProfile = normalizeProfile(profileData);

    if (!normalizedProfile) {
      setMessage("没有找到这个用户，或者你没有权限查看。");
      setLoading(false);
      return;
    }

    setProfile(normalizedProfile);

    const { data: postsData, error: postsError } = await supabase.rpc(
      "admin_get_user_posts",
      {
        target_user_id: userId,
      }
    );

    if (postsError) {
      console.error(postsError);
      setMessage(`读取用户帖子失败：${postsError.message}`);
      setLoading(false);
      return;
    }

    setPosts(normalizePosts(postsData));
    setLoading(false);
  }

  useEffect(() => {
    if (userId) {
      loadAdminUserPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleDeletePost(post: AdminPost) {
    const confirmed = window.confirm(
      `确定要删除这个帖子吗？\n\n${post.title}\n\n删除后普通用户列表中将不再显示。`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_delete_post", {
      target_table: post.source_table,
      target_post_id: post.id,
    });

    setActionLoading(false);

    if (error) {
      console.error(error);
      setMessage(`删除失败：${error.message}`);
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.filter(
        (currentPost) =>
          !(
            currentPost.id === post.id &&
            currentPost.source_table === post.source_table
          )
      )
    );

    setMessage("帖子已删除。");
  }

  async function handleRevokeVerification() {
    if (!profile) return;

    const confirmed = window.confirm(
      `确定要取消这个用户的 CSA/ CSSA 认证吗？\n\n${
        profile.email || profile.school_email || profile.display_name || profile.id
      }`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_revoke_user_verification", {
      target_user_id: profile.id,
    });

    setActionLoading(false);

    if (error) {
      console.error(error);
      setMessage(`取消认证失败：${error.message}`);
      return;
    }

    setProfile({
      ...profile,
      cssa_status: "revoked",
    });

    setMessage("已取消该用户的 CSA/ CSSA 认证。");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market
            </Link>

            <Link
              href="/admin"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-400 hover:text-white"
            >
              返回后台
            </Link>
          </nav>

          <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
            <h1 className="text-2xl font-bold">正在读取用户主页...</h1>

            <p className="mt-3 text-neutral-400">
              正在读取用户资料、认证状态和帖子列表。
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile || message.includes("不是管理员") || message.includes("没有找到")) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market
            </Link>

            <Link
              href="/admin"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-400 hover:text-white"
            >
              返回后台
            </Link>
          </nav>

          <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
            <h1 className="text-2xl font-bold">无法查看这个用户</h1>

            <p className="mt-3 text-neutral-400">
              {message || "这个用户不存在，或者你没有权限查看。"}
            </p>

            <Link
              href="/admin"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
            >
              返回后台
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Campus Market
          </Link>

          <div className="flex items-center gap-3">
            {adminRole && (
              <span className="hidden rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-400 sm:inline-block">
                {adminRole.role === "super_admin"
                  ? "Super Admin"
                  : `${adminRole.school_short_name} CSSA Admin`}
              </span>
            )}

            <Link
              href="/admin"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-400 hover:text-white"
            >
              返回后台
            </Link>
          </div>
        </nav>

        <header className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  用户主页
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs ${getCssaStatusClass(
                    profile.cssa_status
                  )}`}
                >
                  {getCssaStatusText(profile.cssa_status)}
                </span>

                {profile.school_short_name && (
                  <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                    {profile.school_short_name}
                  </span>
                )}
              </div>

              <h1 className="mt-5 text-4xl font-bold">
                {profile.display_name || "未设置昵称"}
              </h1>

              <p className="mt-3 break-all text-sm text-neutral-400">
                {profile.email || profile.school_email || "邮箱未知"}
              </p>

              {profile.bio ? (
                <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-neutral-300">
                  {profile.bio}
                </p>
              ) : (
                <p className="mt-5 text-sm text-neutral-500">
                  这个用户还没有填写个人简介。
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              {profile.cssa_status === "verified" && (
                <button
                  type="button"
                  onClick={handleRevokeVerification}
                  disabled={actionLoading}
                  className="rounded-full border border-red-900 px-5 py-3 text-sm font-medium text-red-300 hover:border-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "处理中..." : "取消 CSA/ CSSA 认证"}
                </button>
              )}

              <button
                type="button"
                onClick={loadAdminUserPage}
                disabled={actionLoading}
                className="rounded-full border border-neutral-700 px-5 py-3 text-sm font-medium text-neutral-200 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                刷新资料
              </button>
            </div>
          </div>
        </header>

        {message && !message.includes("不是管理员") && !message.includes("没有找到") && (
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            <p className="text-sm text-neutral-300">{message}</p>
          </div>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
              <h2 className="text-xl font-semibold">学校信息</h2>

              <div className="mt-5 space-y-3">
                <ContactRow label="学校" value={profile.school_name} />

                <ContactRow label="学校简称" value={profile.school_short_name} />

                <ContactRow
                  label="注册学校邮箱"
                  value={profile.school_email}
                />

                <ContactRow
                  label="注册时间"
                  value={formatDate(profile.created_at)}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
              <h2 className="text-xl font-semibold">联系方式</h2>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                这里显示的是用户个人主页里的联系方式设置。已经发布的帖子可能还保存了发帖时的联系方式快照。
              </p>

              <div className="mt-5 space-y-3">
                <ContactRow
                  label="微信"
                  value={profile.wechat}
                  visible={profile.show_wechat}
                />

                <ContactRow
                  label="手机号"
                  value={profile.phone}
                  visible={profile.show_phone}
                />

                <ContactRow
                  label="联系邮箱"
                  value={profile.contact_email}
                  visible={profile.show_email}
                />
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div className="grid gap-4 sm:grid-cols-4 xl:w-[520px]">
                  <div>
                    <p className="text-sm text-neutral-500">全部帖子</p>
                    <p className="mt-2 text-3xl font-bold">{posts.length}</p>
                  </div>

                  <div>
                    <p className="text-sm text-neutral-500">商品</p>
                    <p className="mt-2 text-3xl font-bold">
                      {productPosts.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-neutral-500">房源</p>
                    <p className="mt-2 text-3xl font-bold">
                      {housingPosts.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-neutral-500">需求</p>
                    <p className="mt-2 text-3xl font-bold">
                      {requestPosts.length}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={activeFilters.products}
                    label="商品"
                    count={productPosts.length}
                    onClick={() => toggleFilter("products")}
                  />

                  <FilterButton
                    active={activeFilters.housing}
                    label="房源"
                    count={housingPosts.length}
                    onClick={() => toggleFilter("housing")}
                  />

                  <FilterButton
                    active={activeFilters.requests}
                    label="需求"
                    count={requestPosts.length}
                    onClick={() => toggleFilter("requests")}
                  />

                  <FilterButton
                    active={activeFilters.offers}
                    label="发布"
                    count={offerPosts.length}
                    onClick={() => toggleFilter("offers")}
                  />

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-500 hover:border-neutral-500 hover:text-white"
                  >
                    全部显示
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-semibold">用户帖子</h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    管理员页面不再打开普通帖子详情，只保留删除管理操作。
                  </p>
                </div>

                <p className="text-sm text-neutral-500">
                  当前显示 {filteredPosts.length} 个
                </p>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center">
                  <h3 className="text-lg font-semibold">暂无匹配帖子</h3>

                  <p className="mt-2 text-sm text-neutral-500">
                    可以打开更多筛选开关，或者点击“全部显示”。
                  </p>
                </div>
              ) : (
                <div className="mt-6 max-h-[760px] space-y-5 overflow-y-auto pr-2">
                  {filteredPosts.map((post) => (
                    <PostCard
                      key={`${post.source_table}-${post.id}`}
                      post={post}
                      actionLoading={actionLoading}
                      onDelete={handleDeletePost}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}