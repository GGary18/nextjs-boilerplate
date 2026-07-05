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

const UTILITIES_OPTIONS = [
  "包水电网",
  "包水",
  "包网",
  "不包水电网",
  "可协商",
];

const ROOMMATE_OPTIONS = [
  "无室友",
  "有室友",
  "女生室友",
  "男生室友",
  "不限",
  "可协商",
];

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

function formatRentLabel(rentValue: string, rentNote: string) {
  const base = `$${rentValue.trim()}/月`;
  const note = rentNote.trim();

  if (!note) return base;

  return `${base} · ${note}`;
}

function buildTags({
  title,
  housingType,
  schoolShortName,
  location,
  furnished,
  utilities,
  roommate,
  manualTags,
}: {
  title: string;
  housingType: string;
  schoolShortName: string;
  location: string;
  furnished: string;
  utilities: string;
  roommate: string;
  manualTags: string[];
}) {
  const rawTags = [
    title,
    housingType,
    schoolShortName,
    location,
    furnished,
    utilities,
    roommate,
    "房源",
    "短租",
    "sublease",
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

export default function PostHousingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [rentNote, setRentNote] = useState("");
  const [housingType, setHousingType] = useState(HOUSING_TYPE_OPTIONS[1]);
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [furnished, setFurnished] = useState(FURNISHED_OPTIONS[0]);
  const [utilities, setUtilities] = useState(UTILITIES_OPTIONS[4]);
  const [roommate, setRoommate] = useState(ROOMMATE_OPTIONS[5]);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [needsContactSetup, setNeedsContactSetup] = useState(false);

  function handleMoneyChange(value: string) {
    if (value === "" || /^\d*(\.\d{0,2})?$/.test(value)) {
      setRentValue(value);
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    const remainingSlots = Math.max(0, 8 - images.length);
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
        .from("housing-images")
        .upload(fileName, compressedImage, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/webp",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("housing-images")
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
      setMessage("请先登录后再发布房源。");
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
      setMessage("请填写房源标题。");
      return;
    }

    if (!rentValue.trim()) {
      setMessage("请填写数字租金。租金只能输入数字，例如 1200 或 1200.50。");
      return;
    }

    if (!isValidMoneyInput(rentValue)) {
      setMessage("租金只能输入数字，最多保留两位小数。例如 1200 或 1200.50。");
      return;
    }

    if (!selectedSchool) {
      setMessage("请输入学校简称或全名，并从搜索结果里选择学校。");
      return;
    }

    if (!location.trim()) {
      setMessage("请填写大致位置。");
      return;
    }

    if (!startDate) {
      setMessage("请选择开始日期。");
      return;
    }

    if (!endDate) {
      setMessage("请选择结束日期。");
      return;
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setMessage("结束日期不能早于开始日期。");
      return;
    }

    if (manualTags.length === 0) {
      setMessage("请至少添加一个手动标签，方便别人搜索到这个房源。");
      return;
    }

    if (!description.trim()) {
      setMessage("请填写房源描述。");
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadImages(user.id);

      const searchTags = buildTags({
        title,
        housingType,
        schoolShortName: selectedSchool.school_short_name,
        location,
        furnished,
        utilities,
        roommate,
        manualTags,
      });

      const { data: insertedPost, error: insertError } = await supabase
        .from("housing_posts")
        .insert({
          owner_id: user.id,
          post_type: "offer",
          title: title.trim(),
          rent_label: formatRentLabel(rentValue, rentNote),
          rent_value: Number(rentValue),
          school_name: selectedSchool.school_name,
          school_short_name: selectedSchool.school_short_name,
          location: location.trim(),
          housing_type: housingType,
          start_date: startDate,
          end_date: endDate,
          furnished,
          utilities,
          roommate,
          address: address.trim(),
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

      if (insertedPost?.id) {
        router.push(`/housing/${insertedPost.id}`);
        router.refresh();
        return;
      }

      router.push("/housing");
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
              href="/housing"
              className="text-sm text-neutral-400 hover:text-white"
            >
              返回房源列表
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
          <p className="text-sm text-neutral-400">发布短租房源</p>

          <h1 className="mt-3 text-4xl font-bold">转租一套房子</h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
            发布时会保存你当前公开的联系方式。之后即使你在个人主页关闭联系方式，这个房源帖仍会保留发布时的联系信息。
          </p>
        </section>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-xl font-semibold">基础信息</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm text-neutral-400">房源标题</label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：CMU 附近 1B1B 暑期转租 / Pitt 附近主卧转租"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">月租数字</label>

                <input
                  value={rentValue}
                  onChange={(event) => handleMoneyChange(event.target.value)}
                  placeholder="例如：1200"
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />

                <p className="mt-2 text-xs text-neutral-600">
                  这里只能填数字，用于租金筛选。不要输入 $、刀、可议等文字。
                </p>
              </div>

              <div>
                <label className="text-sm text-neutral-400">租金补充说明</label>

                <input
                  value={rentNote}
                  onChange={(event) => setRentNote(event.target.value)}
                  placeholder="例如：包水网 / 可议 / 原价 1600"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">房型</label>

                <select
                  value={housingType}
                  onChange={(event) => setHousingType(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                >
                  {HOUSING_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-400">家具情况</label>

                <select
                  value={furnished}
                  onChange={(event) => setFurnished(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                >
                  {FURNISHED_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-400">水电网</label>

                <select
                  value={utilities}
                  onChange={(event) => setUtilities(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                >
                  {UTILITIES_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-400">室友情况</label>

                <select
                  value={roommate}
                  onChange={(event) => setRoommate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                >
                  {ROOMMATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <SchoolSearchSelect
                  label="房源所在学校"
                  placeholder="输入学校简称或全名"
                  helperText="选择这个房源主要面向的学校，例如 CMU、PITT、WFU、SAIC。"
                  selectedSchool={selectedSchool}
                  onSelectSchool={setSelectedSchool}
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">大致位置</label>

                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="例如：CMU 附近 / Oakland / Winston-Salem"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">
                  具体地址，可选
                </label>

                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="例如：公寓名 / 街道名，可不填门牌号"
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">开始日期</label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">结束日期</label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-xl font-semibold">图片、标签和描述</h2>

            <div className="mt-6">
              <label className="text-sm text-neutral-400">房源图片</label>

              <div className="mt-2 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-5">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={images.length >= 8}
                  className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="mt-3 text-xs text-neutral-500">
                  最多上传 8 张图片。上传时会自动压缩为 WebP。
                </p>
              </div>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {images.map((image, index) => (
                    <div
                      key={image.previewUrl}
                      className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                    >
                      <img
                        src={image.previewUrl}
                        alt={`房源图片 ${index + 1}`}
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
                placeholder="输入标签后按 Enter，例如 暑期、拎包入住、近CMU"
                helperText="标签用于搜索。描述是给人看的，标签是给系统匹配用的。"
              />
            </div>

            <div className="mt-6">
              <label className="text-sm text-neutral-400">房源描述</label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="写清楚房间情况、租期、租金包含什么、距离学校多久、是否可续租、室友情况等。"
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
              {isSubmitting ? "发布中..." : "发布房源"}
            </button>

            <Link
              href="/housing"
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