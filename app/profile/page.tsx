"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthNav from "@/app/components/AuthNav";
import CssaVerificationNotice from "@/app/components/CssaVerificationNotice";
import { createClient } from "@/lib/supabase/client";

type ManagedPostKind = "listing" | "housing";
type ManagedPostType = "offer" | "request";

type Profile = {
  display_name: string | null;
  bio: string | null;
  school_name: string | null;
  school_short_name: string | null;
  school_email: string | null;
  wechat: string | null;
  phone: string | null;
  contact_email: string | null;
  show_wechat: boolean;
  show_phone: boolean;
  show_email: boolean;
  cssa_status: string | null;
};

type ManagedPost = {
  id: string;
  kind: ManagedPostKind;
  postType: ManagedPostType;

  title: string;
  priceOrRentLabel: string;
  priceOrRentValue: number;

  schoolShortName: string;
  location: string;
  categoryOrType: string;
  description: string;

  imageUrls: string[];

  status: string;
  createdAt: string;
};

type FilterKey = "products" | "housing" | "requests" | "offers";

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

function getCssaStatusText(status: string | null) {
  if (status === "verified") {
    return "CSSA 已认证";
  }

  return "CSSA 未认证";
}

function getPostLabel(post: ManagedPost) {
  if (post.kind === "listing" && post.postType === "offer") {
    return "商品发布";
  }

  if (post.kind === "listing" && post.postType === "request") {
    return "商品需求";
  }

  if (post.kind === "housing" && post.postType === "offer") {
    return "房源发布";
  }

  return "房源需求";
}

function getPostBadgeClass(post: ManagedPost) {
  if (post.postType === "request") {
    return "border-yellow-700 bg-yellow-950/50 text-yellow-300";
  }

  return "border-neutral-700 text-neutral-300";
}

function getDetailHref(post: ManagedPost) {
  if (post.kind === "listing") {
    return `/listings/${post.id}`;
  }

  return `/housing/${post.id}`;
}

function mapListingToManagedPost(row: any): ManagedPost {
  return {
    id: row.id,
    kind: "listing",
    postType: row.post_type,

    title: row.title || "未命名帖子",
    priceOrRentLabel: row.price_label || `$${row.price_value || 0}`,
    priceOrRentValue: Number(row.price_value || 0),

    schoolShortName: row.school_short_name || "",
    location: row.location || "",
    categoryOrType: row.category || "",
    description: row.description || "",

    imageUrls: row.image_urls || [],

    status: row.status || "active",
    createdAt: row.created_at || "",
  };
}

function mapHousingToManagedPost(row: any): ManagedPost {
  return {
    id: row.id,
    kind: "housing",
    postType: row.post_type,

    title: row.title || "未命名帖子",
    priceOrRentLabel: row.rent_label || `$${row.rent_value || 0}/月`,
    priceOrRentValue: Number(row.rent_value || 0),

    schoolShortName: row.school_short_name || "",
    location: row.location || "",
    categoryOrType: row.housing_type || "",
    description: row.description || "",

    imageUrls: row.image_urls || [],

    status: row.status || "active",
    createdAt: row.created_at || "",
  };
}

function FilterSwitch({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ${
        active
          ? "border-neutral-600 bg-neutral-950 text-white"
          : "border-neutral-800 bg-neutral-900/40 text-neutral-500 hover:border-neutral-600"
      }`}
    >
      <div className="text-left">
        <p className="font-semibold">{label}</p>

        <p className="mt-1 text-xs opacity-70">{count} 条</p>
      </div>

      <span
        className={`relative h-6 w-11 rounded-full transition ${
          active ? "bg-white" : "bg-neutral-800"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full transition ${
            active ? "left-6 bg-black" : "left-1 bg-neutral-500"
          }`}
        />
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ManagedPost[]>([]);

  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    products: true,
    housing: true,
    requests: true,
    offers: true,
  });

  useEffect(() => {
    async function loadProfileAndPosts() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setMessage(userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setMessage(profileError.message);
      } else {
        setProfile(profileData);
      }

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (listingError) {
        console.error(listingError);
        setMessage(listingError.message);
      }

      const { data: housingData, error: housingError } = await supabase
        .from("housing_posts")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (housingError) {
        console.error(housingError);
        setMessage(housingError.message);
      }

      const managedListings = (listingData || []).map(mapListingToManagedPost);
      const managedHousing = (housingData || []).map(mapHousingToManagedPost);

      const mergedPosts = [...managedListings, ...managedHousing].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setPosts(mergedPosts);
      setLoading(false);
    }

    loadProfileAndPosts();
  }, [supabase]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchKind =
        (filters.products && post.kind === "listing") ||
        (filters.housing && post.kind === "housing");

      const matchPostType =
        (filters.requests && post.postType === "request") ||
        (filters.offers && post.postType === "offer");

      return matchKind && matchPostType;
    });
  }, [posts, filters]);

  const postCounts = useMemo(() => {
    return {
      products: posts.filter((post) => post.kind === "listing").length,
      housing: posts.filter((post) => post.kind === "housing").length,
      requests: posts.filter((post) => post.postType === "request").length,
      offers: posts.filter((post) => post.postType === "offer").length,
    };
  }, [posts]);

  function toggleFilter(filterKey: FilterKey) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: !currentFilters[filterKey],
    }));
  }

  async function handleDelete(post: ManagedPost) {
    const confirmed = window.confirm(
      `确定要删除「${post.title}」吗？删除后这个帖子会从列表和详情页消失。`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    const tableName = post.kind === "listing" ? "listings" : "housing_posts";

    const { error } = await supabase.from(tableName).delete().eq("id", post.id);

    if (error) {
      console.error(error);
      setMessage(`删除失败：${error.message}`);
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.filter(
        (currentPost) =>
          !(currentPost.kind === post.kind && currentPost.id === post.id)
      )
    );

    setMessage("删除成功。");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-6xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market
            </Link>

            <AuthNav />
          </nav>

          <div className="mt-20 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8">
            <p className="text-neutral-400">正在读取个人主页...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto max-w-5xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Campus Market
            </Link>

            <AuthNav />
          </nav>

          <div className="mt-20 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8">
            <p className="text-sm text-neutral-400">需要登录</p>

            <h1 className="mt-3 text-3xl font-bold">请登录后查看个人主页</h1>

            <p className="mt-4 text-neutral-400">
              登录后你可以管理自己发布的商品、求购、房源和求租需求。
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

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Campus Market
          </Link>

          <AuthNav />
        </nav>

        <header className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-400">个人主页</p>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">
                  {profile?.display_name || "未设置昵称"}
                </h1>

                <p className="mt-2 text-neutral-400">
                  {profile?.school_short_name ||
                    profile?.school_name ||
                    "学校未填写"}
                </p>

                <p className="mt-1 text-sm text-neutral-500">{userEmail}</p>
              </div>

              <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                {getCssaStatusText(profile?.cssa_status || null)}
              </span>
            </div>

            {profile?.bio && (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-neutral-400">
                {profile.bio}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/profile/edit"
                className="rounded-full bg-white px-5 py-3 text-center font-medium text-black hover:bg-neutral-200"
              >
                编辑个人资料
              </Link>

              <Link
                href="/"
                className="rounded-full border border-neutral-700 px-5 py-3 text-center font-medium text-white hover:border-neutral-400"
              >
                返回首页
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-400">我的帖子筛选</p>

            <h2 className="mt-3 text-2xl font-bold">管理你发布过的内容</h2>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              默认四个开关全开。关闭某个开关后，对应类型会从下面列表中隐藏。
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSwitch
                label="商品"
                count={postCounts.products}
                active={filters.products}
                onClick={() => toggleFilter("products")}
              />

              <FilterSwitch
                label="房源"
                count={postCounts.housing}
                active={filters.housing}
                onClick={() => toggleFilter("housing")}
              />

              <FilterSwitch
                label="需求"
                count={postCounts.requests}
                active={filters.requests}
                onClick={() => toggleFilter("requests")}
              />

              <FilterSwitch
                label="发布"
                count={postCounts.offers}
                active={filters.offers}
                onClick={() => toggleFilter("offers")}
              />
            </div>
          </div>
        </header>

        <CssaVerificationNotice
          schoolShortName={profile?.school_short_name}
          cssaStatus={profile?.cssa_status}
        />

        {message && (
          <div className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
            <p className="text-sm text-neutral-300">{message}</p>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">
                共显示 {filteredPosts.length} 条
              </p>

              <h2 className="mt-1 text-2xl font-bold">我的帖子</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/sell"
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-400"
              >
                发布商品
              </Link>

              <Link
                href="/request-item"
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-400"
              >
                求好物
              </Link>

              <Link
                href="/post-housing"
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-400"
              >
                发布房源
              </Link>

              <Link
                href="/request-housing"
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-400"
              >
                求短租
              </Link>
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
              <h3 className="text-2xl font-bold">暂无匹配帖子</h3>

              <p className="mt-3 text-neutral-400">
                你可以打开更多筛选开关，或者发布新的商品、房源、求购和求租。
              </p>
            </div>
          ) : (
            <div className="max-h-[1250px] overflow-y-auto pr-2">
              <div className="grid gap-5 pb-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => {
                  const coverImageUrl = post.imageUrls[0];

                  return (
                    <div
                      key={`${post.kind}-${post.id}`}
                      className={`rounded-3xl border p-5 ${
                        post.postType === "request"
                          ? "border-yellow-900/60 bg-yellow-950/10"
                          : "border-neutral-800 bg-neutral-900/40"
                      }`}
                    >
                      <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-neutral-800 text-neutral-500">
                        {coverImageUrl ? (
                          <img
                            src={coverImageUrl}
                            alt={post.title}
                            className="h-full w-full object-cover"
                          />
                        ) : post.kind === "listing" ? (
                          post.postType === "request" ? (
                            "商品需求"
                          ) : (
                            "商品图片"
                          )
                        ) : post.postType === "request" ? (
                          "求租需求"
                        ) : (
                          "房源图片"
                        )}
                      </div>

                      <div className="mt-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${getPostBadgeClass(
                            post
                          )}`}
                        >
                          {getPostLabel(post)}
                        </span>

                        <h3 className="mt-3 line-clamp-2 text-xl font-semibold">
                          {post.title}
                        </h3>

                        <p className="mt-2 text-sm text-neutral-400">
                          {post.schoolShortName} ·{" "}
                          {post.location || "位置未填写"}
                        </p>

                        <p className="mt-4 text-2xl font-bold">
                          {post.priceOrRentLabel}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-300">
                        {post.categoryOrType && (
                          <span className="rounded-full border border-neutral-700 px-3 py-1">
                            {post.categoryOrType}
                          </span>
                        )}

                        <span className="rounded-full border border-neutral-700 px-3 py-1">
                          {formatDate(post.createdAt)}
                        </span>
                      </div>

                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-400">
                        {post.description || "暂无描述"}
                      </p>

                      <div className="mt-5 grid gap-3 border-t border-neutral-800 pt-4">
                        <Link
                          href={getDetailHref(post)}
                          className="rounded-full border border-neutral-700 px-4 py-2 text-center text-sm font-medium text-white hover:border-neutral-400"
                        >
                          查看
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(post)}
                          className="rounded-full border border-red-900/70 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500 hover:text-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}