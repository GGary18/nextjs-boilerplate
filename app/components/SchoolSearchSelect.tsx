"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SchoolOption = {
  school_short_name: string;
  school_name: string;
  email_domains: string[];
};

type SchoolSearchSelectProps = {
  label?: string;
  placeholder?: string;
  helperText?: string;
  selectedSchool: SchoolOption | null;
  onSelectSchool: (school: SchoolOption | null) => void;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function scoreSchoolMatch(school: SchoolOption, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return 0;

  const shortName = normalizeText(school.school_short_name);
  const schoolName = normalizeText(school.school_name);
  const domains = school.email_domains.map((domain) => normalizeText(domain));

  if (shortName === normalizedQuery) return 1000;
  if (schoolName === normalizedQuery) return 950;

  if (shortName.startsWith(normalizedQuery)) return 900;
  if (schoolName.startsWith(normalizedQuery)) return 800;

  if (shortName.includes(normalizedQuery)) return 700;
  if (schoolName.includes(normalizedQuery)) return 600;

  if (domains.some((domain) => domain.startsWith(normalizedQuery))) return 500;
  if (domains.some((domain) => domain.includes(normalizedQuery))) return 400;

  return 0;
}

function getFilteredSchools(schools: SchoolOption[], query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return [];

  return schools
    .map((school) => ({
      school,
      score: scoreSchoolMatch(school, trimmedQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      return a.school.school_name.localeCompare(b.school.school_name);
    })
    .map((item) => item.school)
    .slice(0, 15);
}

function getDomainText(school: SchoolOption) {
  if (school.email_domains.length === 0) {
    return "暂无邮箱后缀";
  }

  return school.email_domains.map((domain) => `@${domain}`).join(" / ");
}

export default function SchoolSearchSelect({
  label = "学校",
  placeholder = "输入学校简称或全名",
  helperText = "输入学校简称或全名，然后从搜索结果中选择学校。",
  selectedSchool,
  onSelectSchool,
}: SchoolSearchSelectProps) {
  const supabase = useMemo(() => createClient(), []);

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredSchools = useMemo(() => {
    return getFilteredSchools(schools, schoolSearch);
  }, [schools, schoolSearch]);

  useEffect(() => {
    async function loadSchools() {
      setIsLoadingSchools(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("schools")
        .select("school_short_name, school_name, email_domains")
        .eq("is_active", true)
        .order("school_name", { ascending: true });

      setIsLoadingSchools(false);

      if (error) {
        console.error(error);
        setErrorMessage(`读取学校列表失败：${error.message}`);
        return;
      }

      const loadedSchools: SchoolOption[] = (data || []).map((school) => ({
        school_short_name: String(school.school_short_name || ""),
        school_name: String(school.school_name || ""),
        email_domains: Array.isArray(school.email_domains)
          ? school.email_domains.map((domain) => String(domain))
          : [],
      }));

      setSchools(loadedSchools);
    }

    loadSchools();
  }, [supabase]);

  useEffect(() => {
    if (!selectedSchool) {
      setSchoolSearch("");
      return;
    }

    setSchoolSearch(
      `${selectedSchool.school_short_name} · ${selectedSchool.school_name}`
    );
  }, [selectedSchool]);

  function handleSearchChange(value: string) {
    setSchoolSearch(value);
    onSelectSchool(null);
    setShowResults(true);
  }

  function handleSelectSchool(school: SchoolOption) {
    onSelectSchool(school);
    setSchoolSearch(`${school.school_short_name} · ${school.school_name}`);
    setShowResults(false);
    setErrorMessage("");
  }

  return (
    <div className="relative">
      <label className="text-sm text-neutral-400">{label}</label>

      <input
        value={schoolSearch}
        onChange={(event) => handleSearchChange(event.target.value)}
        onFocus={() => setShowResults(true)}
        placeholder={isLoadingSchools ? "正在读取学校..." : placeholder}
        className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
      />

      {showResults && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-2xl">
          {isLoadingSchools ? (
            <div className="px-3 py-3 text-sm text-neutral-500">
              正在读取学校...
            </div>
          ) : errorMessage ? (
            <div className="px-3 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          ) : schoolSearch.trim().length === 0 ? (
            <div className="px-3 py-3 text-sm text-neutral-500">
              输入学校简称或全名，例如 NYU、CMU、Wake Forest、SAIC。
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="px-3 py-3 text-sm text-neutral-500">
              没有匹配的学校。
            </div>
          ) : (
            filteredSchools.map((school) => (
              <button
                key={school.school_short_name}
                type="button"
                onClick={() => handleSelectSchool(school)}
                className="w-full rounded-xl px-3 py-3 text-left hover:bg-neutral-900"
              >
                <div className="font-medium text-white">
                  {school.school_short_name} · {school.school_name}
                </div>

                <div className="mt-1 text-xs text-neutral-500">
                  {getDomainText(school)}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selectedSchool ? (
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          已选择：{selectedSchool.school_short_name} ·{" "}
          {selectedSchool.school_name}
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-neutral-600">{helperText}</p>
      )}
    </div>
  );
}