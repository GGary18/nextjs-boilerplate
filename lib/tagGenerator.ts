type GenerateListingTagsInput = {
  title?: string;
  category?: string;
  condition?: string;
  description?: string;
  manualTags?: string[];
};

type GeneratedListingTags = {
  searchTags: string[];
  relatedTags: string[];
};

function normalizeText(text: string) {
  return text.toLowerCase().trim();
}

function cleanTag(tag: string) {
  return tag.trim().replace(/\s+/g, " ");
}

function addTag(target: Set<string>, tag: string) {
  const cleanedTag = cleanTag(tag);

  if (!cleanedTag) {
    return;
  }

  target.add(cleanedTag);
}

function addTags(target: Set<string>, tags: string[]) {
  tags.forEach((tag) => addTag(target, tag));
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

export function generateListingTags(
  input: GenerateListingTagsInput
): GeneratedListingTags {
  const title = input.title || "";
  const category = input.category || "";
  const condition = input.condition || "";
  const description = input.description || "";
  const manualTags = input.manualTags || [];

  const combinedText = normalizeText(
    `${title} ${category} ${condition} ${description}`
  );

  const searchTags = new Set<string>();
  const relatedTags = new Set<string>();

  // 1. 手动标签：一定进入 search_tags
  addTags(searchTags, manualTags);

  // 2. 基础分类标签
  if (category) {
    addTag(searchTags, category);
  }

  if (condition) {
    addTag(searchTags, condition);
  }

  // 3. 家具类
  if (
    category === "家具" ||
    includesAny(combinedText, [
      "桌",
      "书桌",
      "桌子",
      "椅子",
      "床",
      "床垫",
      "沙发",
      "柜子",
      "架子",
      "ikea",
      "desk",
      "table",
      "chair",
      "bed",
      "mattress",
      "sofa",
      "shelf",
    ])
  ) {
    addTags(searchTags, ["家具", "furniture"]);

    if (includesAny(combinedText, ["书桌", "桌子", "桌", "desk", "table"])) {
      addTags(searchTags, ["书桌", "桌子", "desk"]);
      addTags(relatedTags, ["学习桌", "办公桌", "电脑桌"]);
    }

    if (includesAny(combinedText, ["椅子", "chair"])) {
      addTags(searchTags, ["椅子", "chair"]);
      addTags(relatedTags, ["学习椅", "办公椅"]);
    }

    if (includesAny(combinedText, ["床垫", "mattress"])) {
      addTags(searchTags, ["床垫", "mattress"]);
      addTags(relatedTags, ["床", "卧室家具"]);
    }

    if (includesAny(combinedText, ["床", "bed"])) {
      addTags(searchTags, ["床", "bed"]);
      addTags(relatedTags, ["床架", "床垫", "卧室家具"]);
    }
  }

  // 4. 电子产品
  if (
    category === "电子产品" ||
    includesAny(combinedText, [
      "显示器",
      "屏幕",
      "键盘",
      "鼠标",
      "耳机",
      "电脑",
      "ipad",
      "monitor",
      "screen",
      "keyboard",
      "mouse",
      "headphone",
      "laptop",
    ])
  ) {
    addTags(searchTags, ["电子产品", "electronics"]);

    if (includesAny(combinedText, ["显示器", "屏幕", "monitor", "screen"])) {
      addTags(searchTags, ["显示器", "屏幕", "monitor"]);
      addTags(relatedTags, ["电脑支架", "键盘", "学习用品"]);
    }

    if (includesAny(combinedText, ["键盘", "keyboard", "机械键盘"])) {
      addTags(searchTags, ["键盘", "keyboard", "机械键盘"]);
      addTags(relatedTags, ["鼠标", "显示器", "程序员"]);
    }

    if (includesAny(combinedText, ["鼠标", "mouse"])) {
      addTags(searchTags, ["鼠标", "mouse"]);
      addTags(relatedTags, ["键盘", "电脑配件"]);
    }

    if (includesAny(combinedText, ["耳机", "headphone", "airpods"])) {
      addTags(searchTags, ["耳机", "headphones"]);
      addTags(relatedTags, ["电子产品", "学习用品"]);
    }
  }

  // 5. 生活用品
  if (
    category === "生活用品" ||
    includesAny(combinedText, [
      "锅",
      "厨具",
      "厨房",
      "空气炸锅",
      "灯",
      "台灯",
      "收纳",
      "pan",
      "pot",
      "kitchen",
      "air fryer",
      "lamp",
    ])
  ) {
    addTags(searchTags, ["生活用品"]);

    if (includesAny(combinedText, ["锅", "厨具", "厨房", "pan", "pot"])) {
      addTags(searchTags, ["厨具", "厨房用品"]);
      addTags(relatedTags, ["锅", "餐具", "公寓用品"]);
    }

    if (includesAny(combinedText, ["空气炸锅", "air fryer"])) {
      addTags(searchTags, ["空气炸锅", "air fryer"]);
      addTags(relatedTags, ["厨房", "厨具"]);
    }

    if (includesAny(combinedText, ["灯", "台灯", "lamp"])) {
      addTags(searchTags, ["灯", "台灯", "lamp"]);
      addTags(relatedTags, ["学习用品", "卧室用品"]);
    }
  }

  // 6. 教材
  if (
    category === "教材" ||
    includesAny(combinedText, [
      "教材",
      "课本",
      "书",
      "textbook",
      "book",
      "统计",
      "经济",
      "数学",
    ])
  ) {
    addTags(searchTags, ["教材", "课本", "textbook"]);
    addTags(relatedTags, ["学习用品", "课程资料"]);
  }

  // 7. 新旧程度相关
  if (includesAny(combinedText, ["全新", "未使用", "brand new"])) {
    addTags(searchTags, ["全新"]);
  }

  if (includesAny(combinedText, ["九成新", "八成新", "很新"])) {
    addTags(searchTags, ["成色好"]);
  }

  if (includesAny(combinedText, ["搬家", "毕业", "出清", "moving"])) {
    addTags(relatedTags, ["搬家出清", "毕业出清"]);
  }

  // 8. 去重 + 控制数量
  const finalSearchTags = Array.from(searchTags).slice(0, 30);

  const finalRelatedTags = Array.from(relatedTags)
    .filter((tag) => !searchTags.has(tag))
    .slice(0, 30);

  return {
    searchTags: finalSearchTags,
    relatedTags: finalRelatedTags,
  };
}