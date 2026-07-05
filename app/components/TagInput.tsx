"use client";

import { useState } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  maxTags?: number;
};

function normalizeTag(value: string) {
  return value.trim().replace(/^#/, "").replace(/\s+/g, " ");
}

export default function TagInput({
  tags,
  onChange,
  label = "手动标签",
  placeholder = "输入标签后按 Enter，例如 4K、27寸、宜家",
  helperText = "标签用于搜索和推荐，请和描述分开填写。",
  maxTags = 12,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");

  function addTag(rawValue: string) {
    const nextTag = normalizeTag(rawValue);

    if (!nextTag) return;

    if (nextTag.length > 24) {
      setMessage("单个标签不要超过 24 个字符。");
      return;
    }

    const alreadyExists = tags.some(
      (tag) => tag.toLowerCase() === nextTag.toLowerCase()
    );

    if (alreadyExists) {
      setInputValue("");
      setMessage("这个标签已经添加过了。");
      return;
    }

    if (tags.length >= maxTags) {
      setMessage(`最多添加 ${maxTags} 个标签。`);
      return;
    }

    onChange([...tags, nextTag]);
    setInputValue("");
    setMessage("");
  }

  function removeTag(tagToRemove: string) {
    onChange(tags.filter((tag) => tag !== tagToRemove));
    setMessage("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "，") {
      event.preventDefault();
      addTag(inputValue);
    }

    if (event.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div>
      <label className="text-sm text-neutral-400">{label}</label>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-white hover:border-neutral-400"
            >
              #{tag} ×
            </button>
          ))}
        </div>
      )}

      <input
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          setMessage("");
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
      />

      <p className="mt-2 text-xs leading-5 text-neutral-600">
        {message || helperText}
      </p>
    </div>
  );
}