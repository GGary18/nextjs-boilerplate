"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import SchoolSearchSelect, {
  type SchoolOption,
} from "@/app/components/SchoolSearchSelect";
import TagInput from "@/app/components/TagInput";

const CATEGORY_OPTIONS = [
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

const TRADE_MODE_TEXT = "买卖双方自行沟通付款和交接";

type UploadedImage = {
  file: File;
  previewUrl: string;
};

type ContactProfile = {
  wechat: string | null;
  phone: string | null;
  contact_email: string | null;
  show_wechat: boolean | null;
  show_phone: boolean | null;
  show_email: boolean | null;
};

type ContactSnapshot = {
  contact_wechat: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function isValidMoneyInput(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

function formatBudgetLabel(budgetValue: string, budgetNote: string) {
  const base = `$${budgetValue.trim()}`;
  const note = budgetNote.trim();

  if (!note) return base;

  return `${base} · ${note}`;
}

function buildTags({
  title,
  category,
  schoolShortName,
  location,
  manualTags,
}: {
  title: string;
  category: string;
  schoolShortName: string;
  location: string;
  manualTags: string[];
}) {
  const rawTags = [
    title,
    category,
    schoolShortName,
    location,
    "求购",
    "request",
    ...manualTags,
  ];

  const tags = rawTags
    .map(normalizeTag)
    .filter(Boolean)
    .filter((tag) => tag.length >= 2)
    .slice(0, 30);

  return Array.from(new Set(tags));
}

function getContactSnapshot(profile: ContactProfile | null): ContactSnapshot {
  if (!profile) {
    return {
      contact_wechat: null,
      contact_phone: null,
      contact_email: null,
    };
  }

  const contactWechat =
    profile.show_wechat && profile.wechat?.trim()
      ? profile.wechat.trim()
      : null;

  const contactPhone =
    profile.show_phone && profile.phone?.trim() ? profile.phone.trim() : null;

  const contactEmail =
    profile.show_email && profile.contact_email?.trim()
      ? profile.contact_email.trim()
      : null;

  return {
    contact_wechat: contactWechat,
    contact_phone: contactPhone,
    contact_email: contactEmail,
  };
}

function hasAnyContactSnapshot(snapshot: ContactSnapshot) {
  return Boolean(
    snapshot.contact_wechat || snapshot.contact_phone || snapshot.contact_email
  );
}

async function compressImage(file: File) {
  return imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
  });
}

export default function RequestItemPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [budgetValue, setBudgetValue] = useState("");
  const [budgetNote, setBudgetNote] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [pickupMethod, setPickupMethod] = useState(PICKUP_OPTIONS[4]);
  const [location, setLocation] = useState("");
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [needsContactSetup, setNeedsContactSetup] = useState(false);

  function handleMoneyChange(value: string) {
    if (value === "" || /^\d*(\.\d{0,2})?$/.test(value)) {
      setBudgetValue(value);
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    const remainingSlots = Math.max(0, 6 - images.length);
    const filesToAdd = imageFiles.slice(0, remainingSlots);

    const newImages = filesToAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((currentImages) => [...currentImages, ...newImages]);

    event.target.value = "";
  }

  function removeImage(index: number) {
    setImages((currentImages) => {
      const imageToRemove = currentImages[index];

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return currentImages.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  async function uploadImages(userId: string) {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const compressedImage = await compressImage(image.file);

      const fileName = `${userId}/${crypto.randomUUID()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, compressedImage, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/webp",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  }

  async function getUserContactSnapshot(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("wechat, phone, contact_email, show_wechat, show_phone, show_email")
      .eq("id", userId)
      .single();

    if (error) {
      console.error(error);
      return {
        contact_wechat: null,
        contact_phone: null,
        contact_email: null,
      };
    }

    return getContactSnapshot(data as ContactProfile | null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setNeedsContactSetup(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      setMessage(`读取登录状态失败：${userError.message}`);
      return;
    }

    if (!user) {
      setMessage("请先登录后再发布求购。");
      return;
    }

    const { data: adminRoleData, error: adminRoleError } = await supabase.rpc(
      "get_current_admin_role"
    );

    if (!adminRoleError && Array.isArray(adminRoleData) && adminRoleData[0]) {
      router.push("/admin");
      return;
    }

    const contactSnapshot = await getUserContactSnapshot(user.id);

    if (!hasAnyContactSnapshot(contactSnapshot)) {
      setNeedsContactSetup(true);
      setMessage("发布前请至少公开一种联系方式：微信、手机号或邮箱。");
      return;
    }

    if (!title.trim()) {
      setMessage("请填写求购标题。");
      return;
    }

    if (!budgetValue.trim()) {
      setMessage("请填写数字预算。预算只能输入数字，例如 80 或 80.50。");
      return;
    }

    if (!isValidMoneyInput(budgetValue)) {
      setMessage("预算只能输入数字，最多保留两位小数。例如 80 或 80.50。");
      return;
    }

    if (!selectedSchool) {
      setMessage("请输入学校简称或全名，并从搜索结果里选择学校。");
      return;
    }

    if (!category.trim()) {
      setMessage("请选择分类。");
      return;
    }

    if (manualTags.length === 0) {
      setMessage("请至少添加一个手动标签，方便别人搜索到你的求购需求。");
      return;
    }

    if (!description.trim()) {
      setMessage("请填写求购描述。");
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadImages(user.id);

      const searchTags = buildTags({
        title,
        category,
        schoolShortName: selectedSchool.school_short_name,
        location,
        manualTags,
      });

      const { data: insertedListing, error: insertError } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          post_type: "request",
          title: title.trim(),
          price_label: formatBudgetLabel(budgetValue, budgetNote),
          price_value: Number(budgetValue),
          school_name: selectedSchool.school_name,
          school_short_name: selectedSchool.school_short_name,
          location: location.trim(),
          category,
          item_condition: "求购",
          pickup_method: pickupMethod,
          trade_mode: TRADE_MODE_TEXT,
          description: description.trim(),
          search_tags: searchTags,
          related_tags: manualTags.map(normalizeTag).filter(Boolean),
          image_urls: imageUrls,
          status: "active",
          contact_wechat: contactSnapshot.contact_wechat,
          contact_phone: contactSnapshot.contact_phone,
          contact_email: contactSnapshot.contact_email,
          contact_snapshot_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setMessage("发布成功，正在跳转...");

      if (insertedListing?.id) {
        router.push(`/listings/${insertedListing.id}`);
        router.refresh();
        return;
      }

      router.push("/listings");
      router.refresh();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(`发布失败：${error.message}`);
      } else {
        setMessage("发布失败，请稍后再试。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Campus Market
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/listings"
              className="text-sm text-neutral-400 hover:text-white"
            >
              返回商品列表
            </Link>

            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-white"
            >
              首页
            </Link>
          </div>
        </nav>

        <section className="mt-10">
          <p className="text-sm text-neutral-400">发布求购需求</p>

          <h1 className="mt-3 text-4xl font-bold">想收一件东西</h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
            发布时会保存你当前公开的联系方式。之后即使你在个人主页关闭联系方式，这个求购帖仍会保留发布时的联系信息。
          </p>
        </section>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-xl font-semibold">基础信息</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm text-neutral-400">求购标题</label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：想收一个 27 寸显示器 / 求购二手书桌"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">预算数字</label>

                <input
                  value={budgetValue}
                  onChange={(event) => handleMoneyChange(event.target.value)}
                  placeholder="例如：80"
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />

                <p className="mt-2 text-xs text-neutral-600">
                  这里只能填数字，用于价格筛选。不要输入 $、刀、可议等文字。
                </p>
              </div>

              <div>
                <label className="text-sm text-neutral-400">预算补充说明</label>

                <input
                  value={budgetNote}
                  onChange={(event) => setBudgetNote(event.target.value)}
                  placeholder="例如：以内 / 可议 / 急收"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">分类</label>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-400">交易方式</label>

                <select
                  value={pickupMethod}
                  onChange={(event) => setPickupMethod(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                >
                  {PICKUP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <SchoolSearchSelect
                  label="求购所在学校"
                  placeholder="输入学校简称或全名"
                  helperText="选择这个求购需求主要面向的学校，例如 CMU、PITT、WFU、SAIC。"
                  selectedSchool={selectedSchool}
                  onSelectSchool={setSelectedSchool}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-neutral-400">
                  期望交易地点
                </label>

                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="例如：CMU 附近 / Pitt 附近 / WFU 校园附近"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-xl font-semibold">参考图片、标签和描述</h2>

            <div className="mt-6">
              <label className="text-sm text-neutral-400">参考图片</label>

              <div className="mt-2 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-5">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={images.length >= 6}
                  className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="mt-3 text-xs text-neutral-500">
                  可上传参考图，最多 6 张。不是必须。
                </p>
              </div>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {images.map((image, index) => (
                    <div
                      key={image.previewUrl}
                      className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                    >
                      <img
                        src={image.previewUrl}
                        alt={`参考图片 ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="w-full px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-900 hover:text-white"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <TagInput
                tags={manualTags}
                onChange={setManualTags}
                label="手动标签"
                placeholder="输入标签后按 Enter，例如 显示器、书桌、台灯"
                helperText="标签用于搜索。描述是给人看的，标签是给系统匹配用的。"
              />
            </div>

            <div className="mt-6">
              <label className="text-sm text-neutral-400">求购描述</label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="写清楚你想收什么、预算、能接受的成色、是否需要送货、什么时候需要等。"
                rows={7}
                className="mt-2 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </div>
          </section>

          {message && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <p className="text-sm text-neutral-300">{message}</p>

              {needsContactSetup && (
                <Link
                  href="/profile"
                  className="mt-3 inline-block rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200"
                >
                  去个人主页设置联系方式
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-white px-8 py-4 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "发布中..." : "发布求购"}
            </button>

            <Link
              href="/listings"
              className="rounded-full border border-neutral-700 px-8 py-4 text-center font-medium text-white hover:border-neutral-400"
            >
              取消
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}