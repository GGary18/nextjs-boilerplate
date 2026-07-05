"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthNav from "@/app/components/AuthNav";
import RequireLoginLink from "@/app/components/RequireLoginLink";
import SchoolMultiSelect, {
  type SchoolOption,
} from "@/app/components/SchoolMultiSelect";
import { createClient } from "@/lib/supabase/client";

type ListingPostType = "offer" | "request";

type ListingItem = {
  id: string;
  ownerId: string;
  postType: ListingPostType;

  title: string;

  priceLabel: string;
  priceValue: number;

  schoolName: string;
  schoolShortName: string;

  location: string;
  category: string;
  itemCondition: string;
  pickupMethod: string;
  tradeMode: string;
  description: string;

  searchTags: string[];
  relatedTags: string[];
  imageUrls: string[];

  status: string;
  createdAt: string;
};

const synonymGroups = [
  ["显示器", "monitor", "屏幕", "电脑屏幕"],
  ["键盘", "keyboard", "机械键盘"],
  ["鼠标", "mouse"],
  ["桌子", "书桌", "电脑桌", "desk"],
  ["椅子", "chair"],
  ["床垫", "mattress"],
  ["沙发", "sofa"],
  ["家具", "furniture"],
  ["电子产品", "电子", "数码", "electronics"],
  ["厨房用品", "锅", "碗", "餐具", "kitchen"],
  ["求购", "求好物", "想买", "收"],
  ["出售", "卖", "转手"],
  ["CMU", "Carnegie Mellon", "卡内基梅隆"],
  ["Pitt", "University of Pittsburgh", "匹兹堡大学"],
  ["NYU", "New York University"],
  ["Columbia", "哥大"],
];

const PRODUCT_CATEGORY_OPTIONS = [
  "家具",
  "床垫 / 床架",
  "桌椅",
  "电子产品",
  "显示器 / 电脑配件",
  "厨房用品",
  "小家电",
  "家居用品",
  "学习用品 / 书籍",
  "交通工具",
  "服饰鞋包",
  "运动户外",
  "免费赠送",
  "其他",
];

const PICKUP_OPTIONS = [
  "自取",
  "可送到校园附近",
  "可送到指定地点",
  "可邮寄",
  "可协商",
  "仅限线下当面交易",
];

function normalizeText(text: string) {
  return text.toLowerCase().trim();
}

function expandQuery(query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const terms = new Set<string>();

  terms.add(normalizedQuery);

  for (const group of synonymGroups) {
    const matched = group.some((word) =>
      normalizedQuery.includes(normalizeText(word))
    );

    if (matched) {
      group.forEach((word) => terms.add(normalizeText(word)));
    }
  }

  return Array.from(terms);
}

function getSearchScore(item: ListingItem, query: string) {
  const terms = expandQuery(query);

  if (terms.length === 0) {
    return 1;
  }

  const title = normalizeText(item.title);
  const schoolName = normalizeText(item.schoolName);
  const schoolShortName = normalizeText(item.schoolShortName);
  const location = normalizeText(item.location);
  const category = normalizeText(item.category);
  const itemCondition = normalizeText(item.itemCondition);
  const pickupMethod = normalizeText(item.pickupMethod);
  const tradeMode = normalizeText(item.tradeMode);
  const description = normalizeText(item.description);
  const searchTags = item.searchTags.map(normalizeText);
  const relatedTags = item.relatedTags.map(normalizeText);

  let score = 0;

  for (const term of terms) {
    if (title === term) {
      score += 120;
    }

    if (title.includes(term)) {
      score += 90;
    }

    if (category.includes(term)) {
      score += 70;
    }

    if (schoolName.includes(term) || schoolShortName.includes(term)) {
      score += 60;
    }

    if (location.includes(term)) {
      score += 50;
    }

    if (searchTags.some((tag) => tag === term)) {
      score += 65;
    }

    if (searchTags.some((tag) => tag.includes(term) || term.includes(tag))) {
      score += 40;
    }

    if (relatedTags.some((tag) => tag.includes(term) || term.includes(tag))) {
      score += 25;
    }

    if (itemCondition.includes(term)) {
      score += 20;
    }

    if (pickupMethod.includes(term)) {
      score += 15;
    }

    if (tradeMode.includes(term)) {
      score += 15;
    }

    if (description.includes(term)) {
      score += 20;
    }
  }

  return score;
}

function matchMaxPrice(priceValue: number, maxPriceInput: string) {
  const trimmedValue = maxPriceInput.trim();

  if (!trimmedValue) {
    return true;
  }

  const maxPrice = Number(trimmedValue);

  if (Number.isNaN(maxPrice)) {
    return true;
  }

  if (maxPrice < 0) {
    return true;
  }

  return priceValue <= maxPrice;
}

function mapDatabaseListing(row: any): ListingItem {
  return {
    id: row.id,
    ownerId: row.owner_id,
    postType: row.post_type,

    title: row.title || "",

    priceLabel: row.price_label || "",
    priceValue: Number(row.price_value || 0),

    schoolName: row.school_name || "",
    schoolShortName: row.school_short_name || "",

    location: row.location || "",
    category: row.category || "",
    itemCondition: row.item_condition || "",
    pickupMethod: row.pickup_method || "",
    tradeMode: row.trade_mode || "",
    description: row.description || "",

    searchTags: row.search_tags || [],
    relatedTags: row.related_tags || [],
    imageUrls: row.image_urls || [],

    status: row.status || "active",
    createdAt: row.created_at || "",
  };
}

export default function ListingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<SchoolOption[]>([]);
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [pickupMethod, setPickupMethod] = useState("all");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  useEffect(() => {
    async function loadListings() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setLoading(false);

      if (error) {
        console.error(error);
        setLoadError(error.message);
        return;
      }

      const mappedItems = (data || []).map(mapDatabaseListing);

      setItems(mappedItems);
    }

    loadListings();
  }, [supabase]);

  const categoryOptions = useMemo(() => {
    const categories = items
      .map((item) => item.category)
      .filter((item) => item.trim().length > 0);

    return Array.from(new Set([...PRODUCT_CATEGORY_OPTIONS, ...categories]));
  }, [items]);

  const pickupOptions = useMemo(() => {
    const pickups = items
      .map((item) => item.pickupMethod)
      .filter((item) => item.trim().length > 0);

    return Array.from(new Set([...PICKUP_OPTIONS, ...pickups]));
  }, [items]);

  const filteredListings = useMemo(() => {
    const withScore = items
      .map((item) => ({
        item,
        score: getSearchScore(item, query),
      }))
      .filter(({ item, score }) => {
        const hasKeywordMatch = query.trim() === "" || score > 0;

        const selectedSchoolShortNames = selectedSchools.map(
          (selectedSchool) => selectedSchool.school_short_name
        );

        const hasSchoolMatch =
          selectedSchoolShortNames.length === 0 ||
          selectedSchoolShortNames.includes(item.schoolShortName);

        const hasCategoryMatch =
          category === "all" || item.category === category;

        const hasPriceMatch = matchMaxPrice(item.priceValue, maxPrice);

        const hasPickupMatch =
          pickupMethod === "all" || item.pickupMethod === pickupMethod;

        const hasPostTypeMatch =
          postTypeFilter === "all" || item.postType === postTypeFilter;

        return (
          hasKeywordMatch &&
          hasSchoolMatch &&
          hasCategoryMatch &&
          hasPriceMatch &&
          hasPickupMatch &&
          hasPostTypeMatch
        );
      });

    if (sortBy === "price-low") {
      withScore.sort((a, b) => a.item.priceValue - b.item.priceValue);
    } else if (sortBy === "price-high") {
      withScore.sort((a, b) => b.item.priceValue - a.item.priceValue);
    } else if (query.trim() !== "") {
      withScore.sort((a, b) => b.score - a.score);
    } else {
      withScore.sort(
        (a, b) =>
          new Date(b.item.createdAt).getTime() -
          new Date(a.item.createdAt).getTime()
      );
    }

    return withScore.map(({ item }) => item);
  }, [
    items,
    query,
    selectedSchools,
    category,
    maxPrice,
    pickupMethod,
    postTypeFilter,
    sortBy,
  ]);

  function resetFilters() {
    setQuery("");
    setSelectedSchools([]);
    setCategory("all");
    setMaxPrice("");
    setPickupMethod("all");
    setPostTypeFilter("all");
    setSortBy("latest");
  }

  function handleMaxPriceChange(value: string) {
    if (value === "" || /^\d*(\.\d{0,2})?$/.test(value)) {
      setMaxPrice(value);
    }
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

        <header className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-neutral-400">二手商品</p>

            <h1 className="mt-3 text-4xl font-bold md:text-5xl">
              买卖二手，也可以发布求购。
            </h1>

            <p className="mt-4 max-w-2xl text-neutral-400">
              按学校、分类、价格和关键词筛选二手商品与求购需求。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <RequireLoginLink
              href="/sell"
              className="w-fit rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
              message="发布二手商品需要先登录。登录后你可以发布商品、管理商品状态。"
            >
              发布商品
            </RequireLoginLink>

            <RequireLoginLink
              href="/request-item"
              className="w-fit rounded-full border border-neutral-700 px-6 py-3 font-medium text-white hover:border-neutral-400"
              message="发布求购需求需要先登录。登录后其他用户可以通过你的个人主页联系你。"
            >
              求好物
            </RequireLoginLink>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPostTypeFilter("all")}
              className={`rounded-full px-4 py-2 text-sm ${
                postTypeFilter === "all"
                  ? "bg-white text-black"
                  : "border border-neutral-800 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              全部
            </button>

            <button
              type="button"
              onClick={() => setPostTypeFilter("offer")}
              className={`rounded-full px-4 py-2 text-sm ${
                postTypeFilter === "offer"
                  ? "bg-white text-black"
                  : "border border-neutral-800 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              出售
            </button>

            <button
              type="button"
              onClick={() => setPostTypeFilter("request")}
              className={`rounded-full px-4 py-2 text-sm ${
                postTypeFilter === "request"
                  ? "bg-white text-black"
                  : "border border-neutral-800 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              求购
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索商品，比如 显示器、桌子、CMU"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500 md:col-span-2"
            />

            <SchoolMultiSelect
              selectedSchools={selectedSchools}
              onChange={setSelectedSchools}
              placeholder="输入学校简称或全名"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
            >
              <option value="all">分类</option>

              {categoryOptions.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {categoryOption}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <input
                value={maxPrice}
                onChange={(event) => handleMaxPriceChange(event.target.value)}
                placeholder="最高价格 / 预算，例如 100"
                inputMode="decimal"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />

              <p className="mt-1 text-xs text-neutral-600">
                输入数字后，只显示价格或预算不超过这个金额的帖子。
              </p>
            </div>

            <select
              value={pickupMethod}
              onChange={(event) => setPickupMethod(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
            >
              <option value="all">取货方式</option>

              {pickupOptions.map((pickupOption) => (
                <option key={pickupOption} value={pickupOption}>
                  {pickupOption}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-neutral-800 px-4 py-3 font-medium text-white hover:border-neutral-500"
            >
              清空筛选
            </button>

            <button
              type="button"
              className="rounded-2xl bg-white px-4 py-3 font-medium text-black hover:bg-neutral-200"
            >
              搜索
            </button>
          </div>
        </section>

        {loadError && (
          <div className="mt-6 rounded-3xl border border-red-900 bg-red-950/30 p-5">
            <p className="text-sm text-red-300">读取失败：{loadError}</p>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              {loading
                ? "正在读取商品..."
                : `共找到 ${filteredListings.length} 个帖子`}
            </p>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-white outline-none"
            >
              <option value="latest">最新发布</option>
              <option value="price-low">价格 / 预算从低到高</option>
              <option value="price-high">价格 / 预算从高到低</option>
            </select>
          </div>

          <section className="max-h-[1250px] overflow-y-auto pr-2">
            {loading ? (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
                <h2 className="text-2xl font-bold">正在加载商品</h2>

                <p className="mt-3 text-neutral-400">
                  正在从 Supabase 读取 listings 表。
                </p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
                <h2 className="text-2xl font-bold">没有找到匹配商品</h2>

                <p className="mt-3 text-neutral-400">
                  试试换一个关键词，或者清空筛选条件。
                </p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-6 rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
                >
                  清空筛选
                </button>
              </div>
            ) : (
              <div className="grid gap-5 pb-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredListings.map((item) => {
                  const coverImageUrl = item.imageUrls[0];

                  return (
                    <div
                      key={item.id}
                      className={`rounded-3xl border p-5 transition hover:border-neutral-600 ${
                        item.postType === "request"
                          ? "border-yellow-900/60 bg-yellow-950/10"
                          : "border-neutral-800 bg-neutral-900/40"
                      }`}
                    >
                      <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-neutral-800 text-neutral-500">
                        {coverImageUrl ? (
                          <img
                            src={coverImageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          />
                        ) : item.postType === "request" ? (
                          "求购需求"
                        ) : (
                          "商品图片"
                        )}
                      </div>

                      <div className="mt-5 flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs ${
                                item.postType === "request"
                                  ? "border-yellow-700 bg-yellow-950/50 text-yellow-300"
                                  : "border-neutral-700 text-neutral-300"
                              }`}
                            >
                              {item.postType === "request" ? "求购" : "出售"}
                            </span>
                          </div>

                          <h2 className="text-xl font-semibold">
                            {item.title}
                          </h2>

                          <p className="mt-1 text-sm text-neutral-400">
                            {item.schoolShortName} ·{" "}
                            {item.location || "位置未填写"}
                          </p>
                        </div>

                        <p className="shrink-0 text-xl font-bold">
                          {item.priceLabel || `$${item.priceValue}`}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-300">
                        <span className="rounded-full border border-neutral-700 px-3 py-1">
                          {item.category || "未分类"}
                        </span>

                        {item.itemCondition && (
                          <span className="rounded-full border border-neutral-700 px-3 py-1">
                            {item.itemCondition}
                          </span>
                        )}

                        {item.pickupMethod && (
                          <span className="rounded-full border border-neutral-700 px-3 py-1">
                            {item.pickupMethod}
                          </span>
                        )}
                      </div>

                      {item.tradeMode && (
                        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                          <p className="text-sm text-neutral-400">
                            {item.tradeMode}
                          </p>
                        </div>
                      )}

                      <p className="mt-4 line-clamp-2 text-sm text-neutral-400">
                        {item.description || "暂无描述"}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-neutral-800 pt-4">
                        <p className="text-sm text-neutral-400">
                          {item.postType === "request"
                            ? "需求发布者"
                            : "商品发布者"}
                        </p>

                        <Link
                          href={`/listings/${item.id}`}
                          className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-400"
                        >
                          {item.postType === "request"
                            ? "查看需求"
                            : "查看详情"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}