"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthNav from "@/app/components/AuthNav";
import RequireLoginLink from "@/app/components/RequireLoginLink";
import SchoolMultiSelect, {
  type SchoolOption,
} from "@/app/components/SchoolMultiSelect";
import { createClient } from "@/lib/supabase/client";

type HousingPostType = "offer" | "request";

type HousingItem = {
  id: string;
  ownerId: string;
  postType: HousingPostType;

  title: string;

  rentLabel: string;
  rentValue: number;

  schoolName: string;
  schoolShortName: string;

  location: string;
  housingType: string;
  startDate: string | null;
  endDate: string | null;
  furnished: string;
  utilities: string;
  roommate: string;
  address: string;
  description: string;

  searchTags: string[];
  relatedTags: string[];
  imageUrls: string[];

  status: string;
  createdAt: string;
};

const synonymGroups = [
  ["短租", "转租", "sublease", "sublet"],
  ["房源", "出租", "转租房源"],
  ["求租", "找房", "租房"],
  ["studio", "Studio"],
  ["1b1b", "1B1B", "一室一卫"],
  ["2b1b", "2B1B", "两室一卫"],
  ["2b2b", "2B2B", "两室两卫"],
  ["3b2b", "3B2B", "三室两卫"],
  ["主卧", "master room"],
  ["次卧", "second bedroom"],
  ["客厅", "den", "客厅 / Den"],
  ["家具", "furnished", "拎包入住"],
  ["CMU", "Carnegie Mellon", "卡内基梅隆"],
  ["Pitt", "University of Pittsburgh", "匹兹堡大学"],
  ["NYU", "New York University"],
  ["Columbia", "哥大"],
];

const HOUSING_TYPE_OPTIONS = [
  "Studio",
  "1B1B",
  "2B1B",
  "2B2B",
  "3B1B",
  "3B2B",
  "3B3B",
  "4B及以上",
  "合租单间",
  "主卧",
  "次卧",
  "客厅 / Den",
  "整套转租",
  "其他",
];

const FURNISHED_OPTIONS = [
  "家具齐全",
  "部分家具",
  "无家具",
  "可协商",
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

function getSearchScore(item: HousingItem, query: string) {
  const terms = expandQuery(query);

  if (terms.length === 0) {
    return 1;
  }

  const title = normalizeText(item.title);
  const schoolName = normalizeText(item.schoolName);
  const schoolShortName = normalizeText(item.schoolShortName);
  const location = normalizeText(item.location);
  const housingType = normalizeText(item.housingType);
  const furnished = normalizeText(item.furnished);
  const utilities = normalizeText(item.utilities);
  const roommate = normalizeText(item.roommate);
  const address = normalizeText(item.address);
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

    if (housingType.includes(term)) {
      score += 80;
    }

    if (schoolName.includes(term) || schoolShortName.includes(term)) {
      score += 65;
    }

    if (location.includes(term) || address.includes(term)) {
      score += 55;
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

    if (furnished.includes(term)) {
      score += 20;
    }

    if (utilities.includes(term)) {
      score += 15;
    }

    if (roommate.includes(term)) {
      score += 15;
    }

    if (description.includes(term)) {
      score += 20;
    }
  }

  return score;
}

function matchMaxRent(rentValue: number, maxRentInput: string) {
  const trimmedValue = maxRentInput.trim();

  if (!trimmedValue) {
    return true;
  }

  const maxRent = Number(trimmedValue);

  if (Number.isNaN(maxRent)) {
    return true;
  }

  if (maxRent < 0) {
    return true;
  }

  return rentValue <= maxRent;
}

function parseDate(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function dateRangesOverlap({
  postStart,
  postEnd,
  filterStart,
  filterEnd,
}: {
  postStart: string | null;
  postEnd: string | null;
  filterStart: string;
  filterEnd: string;
}) {
  if (!filterStart && !filterEnd) {
    return true;
  }

  const postStartDate = parseDate(postStart);
  const postEndDate = parseDate(postEnd);
  const filterStartDate = parseDate(filterStart || null);
  const filterEndDate = parseDate(filterEnd || null);

  if (!postStartDate && !postEndDate) {
    return true;
  }

  const effectivePostStart = postStartDate || new Date("1900-01-01T00:00:00");
  const effectivePostEnd = postEndDate || new Date("2999-12-31T00:00:00");
  const effectiveFilterStart =
    filterStartDate || new Date("1900-01-01T00:00:00");
  const effectiveFilterEnd = filterEndDate || new Date("2999-12-31T00:00:00");

  return effectivePostStart <= effectiveFilterEnd && effectivePostEnd >= effectiveFilterStart;
}

function formatDate(value: string | null) {
  if (!value) return "日期待沟通";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "日期待沟通";
  }

  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function mapDatabaseHousing(row: any): HousingItem {
  return {
    id: row.id,
    ownerId: row.owner_id,
    postType: row.post_type,

    title: row.title || "",

    rentLabel: row.rent_label || "",
    rentValue: Number(row.rent_value || 0),

    schoolName: row.school_name || "",
    schoolShortName: row.school_short_name || "",

    location: row.location || "",
    housingType: row.housing_type || "",
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    furnished: row.furnished || "",
    utilities: row.utilities || "",
    roommate: row.roommate || "",
    address: row.address || "",
    description: row.description || "",

    searchTags: row.search_tags || [],
    relatedTags: row.related_tags || [],
    imageUrls: row.image_urls || [],

    status: row.status || "active",
    createdAt: row.created_at || "",
  };
}

export default function HousingPage() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<HousingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<SchoolOption[]>([]);
  const [housingType, setHousingType] = useState("all");
  const [maxRent, setMaxRent] = useState("");
  const [furnished, setFurnished] = useState("all");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  useEffect(() => {
    async function loadHousingPosts() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("housing_posts")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setLoading(false);

      if (error) {
        console.error(error);
        setLoadError(error.message);
        return;
      }

      setItems((data || []).map(mapDatabaseHousing));
    }

    loadHousingPosts();
  }, [supabase]);

  const housingTypeOptions = useMemo(() => {
    const types = items
      .map((item) => item.housingType)
      .filter((item) => item.trim().length > 0);

    return Array.from(new Set([...HOUSING_TYPE_OPTIONS, ...types]));
  }, [items]);

  const furnishedOptions = useMemo(() => {
    const options = items
      .map((item) => item.furnished)
      .filter((item) => item.trim().length > 0);

    return Array.from(new Set([...FURNISHED_OPTIONS, ...options]));
  }, [items]);

  const filteredHousing = useMemo(() => {
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

        const hasHousingTypeMatch =
          housingType === "all" || item.housingType === housingType;

        const hasRentMatch = matchMaxRent(item.rentValue, maxRent);

        const hasFurnishedMatch =
          furnished === "all" || item.furnished === furnished;

        const hasPostTypeMatch =
          postTypeFilter === "all" || item.postType === postTypeFilter;

        const hasDateOverlap = dateRangesOverlap({
          postStart: item.startDate,
          postEnd: item.endDate,
          filterStart: filterStartDate,
          filterEnd: filterEndDate,
        });

        return (
          hasKeywordMatch &&
          hasSchoolMatch &&
          hasHousingTypeMatch &&
          hasRentMatch &&
          hasFurnishedMatch &&
          hasPostTypeMatch &&
          hasDateOverlap
        );
      });

    if (sortBy === "rent-low") {
      withScore.sort((a, b) => a.item.rentValue - b.item.rentValue);
    } else if (sortBy === "rent-high") {
      withScore.sort((a, b) => b.item.rentValue - a.item.rentValue);
    } else if (sortBy === "start-date") {
      withScore.sort((a, b) => {
        const aTime = parseDate(a.item.startDate)?.getTime() || Infinity;
        const bTime = parseDate(b.item.startDate)?.getTime() || Infinity;

        return aTime - bTime;
      });
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
    housingType,
    maxRent,
    furnished,
    postTypeFilter,
    filterStartDate,
    filterEndDate,
    sortBy,
  ]);

  function resetFilters() {
    setQuery("");
    setSelectedSchools([]);
    setHousingType("all");
    setMaxRent("");
    setFurnished("all");
    setPostTypeFilter("all");
    setFilterStartDate("");
    setFilterEndDate("");
    setSortBy("latest");
  }

  function handleMaxRentChange(value: string) {
    if (value === "" || /^\d*(\.\d{0,2})?$/.test(value)) {
      setMaxRent(value);
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
            <p className="text-sm text-neutral-400">短租房源</p>

            <h1 className="mt-3 text-4xl font-bold md:text-5xl">
              找短租，或者发布求租。
            </h1>

            <p className="mt-4 max-w-2xl text-neutral-400">
              按学校、房型、租金和日期筛选房源。日期筛选会显示和你选择时间段有交集的帖子。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <RequireLoginLink
              href="/post-housing"
              className="w-fit rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
              message="发布房源需要先登录。"
            >
              发布房源
            </RequireLoginLink>

            <RequireLoginLink
              href="/request-housing"
              className="w-fit rounded-full border border-neutral-700 px-6 py-3 font-medium text-white hover:border-neutral-400"
              message="发布求租需求需要先登录。"
            >
              发布求租
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
              房源
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
              求租
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索房源，比如 CMU、1B1B、暑期短租"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500 md:col-span-2"
            />

            <SchoolMultiSelect
              selectedSchools={selectedSchools}
              onChange={setSelectedSchools}
              placeholder="输入学校简称或全名"
            />

            <select
              value={housingType}
              onChange={(event) => setHousingType(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
            >
              <option value="all">房型</option>

              {housingTypeOptions.map((housingTypeOption) => (
                <option key={housingTypeOption} value={housingTypeOption}>
                  {housingTypeOption}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <input
                value={maxRent}
                onChange={(event) => handleMaxRentChange(event.target.value)}
                placeholder="最高租金 / 预算，例如 1500"
                inputMode="decimal"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />

              <p className="mt-1 text-xs text-neutral-600">
                输入数字后，只显示租金或预算不超过这个金额的帖子。
              </p>
            </div>

            <select
              value={furnished}
              onChange={(event) => setFurnished(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
            >
              <option value="all">家具情况</option>

              {furnishedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filterStartDate}
              onChange={(event) => setFilterStartDate(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
            />

            <input
              type="date"
              value={filterEndDate}
              onChange={(event) => setFilterEndDate(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
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
                ? "正在读取房源..."
                : `共找到 ${filteredHousing.length} 个帖子`}
            </p>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-white outline-none"
            >
              <option value="latest">最新发布</option>
              <option value="rent-low">租金 / 预算从低到高</option>
              <option value="rent-high">租金 / 预算从高到低</option>
              <option value="start-date">开始日期最近</option>
            </select>
          </div>

          <section className="max-h-[1250px] overflow-y-auto pr-2">
            {loading ? (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
                <h2 className="text-2xl font-bold">正在加载房源</h2>

                <p className="mt-3 text-neutral-400">
                  正在从 Supabase 读取 housing_posts 表。
                </p>
              </div>
            ) : filteredHousing.length === 0 ? (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
                <h2 className="text-2xl font-bold">没有找到匹配房源</h2>

                <p className="mt-3 text-neutral-400">
                  试试换一个学校、日期或清空筛选条件。
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
                {filteredHousing.map((item) => {
                  const coverImageUrl = item.imageUrls[0];

                  return (
                    <div
                      key={item.id}
                      className={`rounded-3xl border p-5 transition hover:border-neutral-600 ${
                        item.postType === "request"
                          ? "border-sky-900/60 bg-sky-950/10"
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
                          "求租需求"
                        ) : (
                          "房源图片"
                        )}
                      </div>

                      <div className="mt-5 flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs ${
                                item.postType === "request"
                                  ? "border-sky-700 bg-sky-950/50 text-sky-300"
                                  : "border-neutral-700 text-neutral-300"
                              }`}
                            >
                              {item.postType === "request" ? "求租" : "房源"}
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
                          {item.rentLabel || `$${item.rentValue}/月`}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-300">
                        <span className="rounded-full border border-neutral-700 px-3 py-1">
                          {item.housingType || "房型未填"}
                        </span>

                        {item.furnished && (
                          <span className="rounded-full border border-neutral-700 px-3 py-1">
                            {item.furnished}
                          </span>
                        )}

                        {item.utilities && (
                          <span className="rounded-full border border-neutral-700 px-3 py-1">
                            {item.utilities}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                        <p className="text-sm text-neutral-400">
                          {formatDate(item.startDate)} -{" "}
                          {formatDate(item.endDate)}
                        </p>
                      </div>

                      <p className="mt-4 line-clamp-2 text-sm text-neutral-400">
                        {item.description || "暂无描述"}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-neutral-800 pt-4">
                        <p className="text-sm text-neutral-400">
                          {item.postType === "request"
                            ? "求租发布者"
                            : "房源发布者"}
                        </p>

                        <Link
                          href={`/housing/${item.id}`}
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