"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SchoolOption = {
  school_short_name: string;
  school_name: string;
  email_domains: string[];
};

type SchoolMultiSelectProps = {
  label?: string;
  placeholder?: string;
  helperText?: string;
  selectedSchools: SchoolOption[];
  onChange: (schools: SchoolOption[]) => void;
  compact?: boolean;
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

function getFilteredSchools({
  schools,
  query,
  selectedSchools,
}: {
  schools: SchoolOption[];
  query: string;
  selectedSchools: SchoolOption[];
}) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return [];

  const selectedShortNames = new Set(
    selectedSchools.map((school) => school.school_short_name)
  );

  return schools
    .filter((school) => !selectedShortNames.has(school.school_short_name))
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
    .slice(0, 12);
}

function getDomainText(school: SchoolOption) {
  if (school.email_domains.length === 0) {
    return "暂无邮箱后缀";
  }

  return school.email_domains.map((domain) => `@${domain}`).join(" / ");
}

export default function SchoolMultiSelect({
  label,
  placeholder = "输入学校简称或全名",
  helperText,
  selectedSchools,
  onChange,
  compact = true,
}: SchoolMultiSelectProps) {
  const supabase = useMemo(() => createClient(), []);

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredSchools = useMemo(() => {
    return getFilteredSchools({
      schools,
      query: schoolSearch,
      selectedSchools,
    });
  }, [schools, schoolSearch, selectedSchools]);

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

  function addSchool(school: SchoolOption) {
    const alreadySelected = selectedSchools.some(
      (selectedSchool) =>
        selectedSchool.school_short_name === school.school_short_name
    );

    if (!alreadySelected) {
      onChange([...selectedSchools, school]);
    }

    setSchoolSearch("");
    setShowResults(false);
  }

  function removeSchool(shortName: string) {
    onChange(
      selectedSchools.filter(
        (school) => school.school_short_name !== shortName
      )
    );
  }

  function clearSchools() {
    onChange([]);
    setSchoolSearch("");
    setShowResults(false);
  }

  return (
    <div className="relative">
      {(label || selectedSchools.length > 0) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label ? (
            <label className="text-sm text-neutral-400">{label}</label>
          ) : (
            <span />
          )}

          {selectedSchools.length > 0 && (
            <button
              type="button"
              onClick={clearSchools}
              className="text-xs text-neutral-500 hover:text-white"
            >
              清空学校
            </button>
          )}
        </div>
      )}

      <input
        value={schoolSearch}
        onChange={(event) => {
          setSchoolSearch(event.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        placeholder={isLoadingSchools ? "正在读取学校..." : placeholder}
        className={`w-full rounded-2xl border border-neutral-800 bg-neutral-950 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500 ${
          compact ? "px-4 py-3" : "px-4 py-4"
        }`}
      />

      {selectedSchools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedSchools.map((school) => (
            <button
              key={school.school_short_name}
              type="button"
              onClick={() => removeSchool(school.school_short_name)}
              className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-white hover:border-neutral-400"
            >
              {school.school_short_name} ×
            </button>
          ))}
        </div>
      )}

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
              输入学校简称或全名，例如 CMU、PITT、NYU、SAIC。
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
                onClick={() => addSchool(school)}
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

      {helperText && (
        <p className="mt-1 text-xs leading-5 text-neutral-600">
          {helperText}
        </p>
      )}
    </div>
  );
}
