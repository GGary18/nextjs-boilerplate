export type HousingTagInput = {
    title: string;
    school: string;
    location: string;
    type: string;
    furnished: string;
    utilities: string;
    roommate: string;
    description?: string;
    manualTags?: string[];
  };
  
  export type GeneratedHousingTags = {
    searchTags: string[];
    relatedTags: string[];
  };
  
  const schoolTags: Record<string, string[]> = {
    CMU: ["CMU", "Carnegie Mellon", "卡内基梅隆"],
    Pitt: ["Pitt", "University of Pittsburgh", "匹兹堡大学"],
    NYU: ["NYU", "New York University"],
    Columbia: ["Columbia", "哥伦比亚大学"],
  };
  
  const locationTags: Record<string, string[]> = {
    Shadyside: ["Shadyside", "近 CMU", "匹兹堡"],
    "Squirrel Hill": ["Squirrel Hill", "近 CMU", "匹兹堡"],
    Oakland: ["Oakland", "近 Pitt", "匹兹堡"],
    "North Oakland": ["North Oakland", "近 CMU", "近 Pitt", "匹兹堡"],
    Downtown: ["Downtown", "市中心", "匹兹堡"],
  };
  
  const typeTags: Record<string, string[]> = {
    Studio: ["Studio", "studio", "单间", "独立空间", "无室友"],
    "1B1B": ["1B1B", "一室一厅", "整套出租", "one bedroom"],
    "2B1B": ["2B1B", "两室一卫", "适合两人"],
    "2B2B": ["2B2B", "两室两卫", "适合两人"],
    主卧: ["主卧", "master bedroom", "卧室"],
    次卧: ["次卧", "卧室", "bedroom"],
    卧室: ["卧室", "bedroom", "合租"],
  };
  
  const furnishedTags: Record<string, string[]> = {
    带家具: ["带家具", "furnished", "拎包入住"],
    全套家具: ["全套家具", "furnished", "拎包入住"],
    部分家具: ["部分家具", "partial furnished"],
    无家具: ["无家具", "unfurnished"],
    带床和桌椅: ["带床", "带桌椅", "带家具", "furnished"],
    带床垫: ["带床垫", "床垫", "部分家具"],
  };
  
  const roommateTags: Record<string, string[]> = {
    整套出租: ["整套出租", "无室友", "entire place"],
    无室友: ["无室友", "独立空间"],
    "有 1 名室友": ["有室友", "合租", "1 名室友"],
    "有 2 名室友": ["有室友", "合租", "2 名室友"],
    女生室友: ["女生室友", "女生公寓", "合租"],
    男生室友: ["男生室友", "合租"],
  };
  
  const utilityRules = [
    {
      keywords: ["包水", "水费"],
      tags: ["包水"],
    },
    {
      keywords: ["包网", "网费", "wifi", "internet"],
      tags: ["包网费", "internet included"],
    },
    {
      keywords: ["水电网平摊", "平摊"],
      tags: ["水电网平摊"],
    },
    {
      keywords: ["水电另算", "水电网另算", "另算"],
      tags: ["水电另算"],
    },
  ];
  
  const featureRules = [
    {
      keywords: ["步行", "walk", "walking"],
      searchTags: ["步行到学校", "walk to campus"],
      relatedTags: ["通勤方便"],
    },
    {
      keywords: ["公交", "bus", "shuttle"],
      searchTags: ["近公交", "bus nearby"],
      relatedTags: ["通勤方便"],
    },
    {
      keywords: ["超市", "grocery", "market"],
      searchTags: ["近超市"],
      relatedTags: ["生活方便"],
    },
    {
      keywords: ["健身房", "gym"],
      searchTags: ["带健身房", "gym"],
      relatedTags: ["公寓设施"],
    },
    {
      keywords: ["停车", "parking"],
      searchTags: ["有停车位", "parking"],
      relatedTags: ["适合有车"],
    },
    {
      keywords: ["洗衣机", "washer"],
      searchTags: ["有洗衣机", "washer"],
      relatedTags: ["公寓设施"],
    },
    {
      keywords: ["烘干机", "dryer"],
      searchTags: ["有烘干机", "dryer"],
      relatedTags: ["公寓设施"],
    },
    {
      keywords: ["宠物", "pet"],
      searchTags: ["可养宠物", "pet friendly"],
      relatedTags: ["宠物友好"],
    },
    {
      keywords: ["安静", "quiet"],
      searchTags: ["安静", "quiet"],
      relatedTags: ["适合学习"],
    },
    {
      keywords: ["续租", "renew"],
      searchTags: ["可续租"],
      relatedTags: ["长期可转"],
    },
    {
      keywords: ["提前入住", "early move in"],
      searchTags: ["可提前入住"],
      relatedTags: ["灵活入住"],
    },
    {
      keywords: ["独立卫生间", "private bathroom"],
      searchTags: ["独立卫生间", "private bathroom"],
      relatedTags: ["隐私好"],
    },
  ];
  
  const baseHousingTags = [
    "短租",
    "转租",
    "sublease",
    "housing",
    "房源",
  ];
  
  function normalizeText(text: string) {
    return text.toLowerCase().trim();
  }
  
  function includesAnyKeyword(text: string, keywords: string[]) {
    const normalizedText = normalizeText(text);
  
    return keywords.some((keyword) =>
      normalizedText.includes(normalizeText(keyword))
    );
  }
  
  function addUnique(target: string[], values: string[]) {
    for (const value of values) {
      if (!target.includes(value)) {
        target.push(value);
      }
    }
  }
  
  export function generateHousingTags(
    input: HousingTagInput
  ): GeneratedHousingTags {
    const title = input.title || "";
    const school = input.school || "";
    const location = input.location || "";
    const type = input.type || "";
    const furnished = input.furnished || "";
    const utilities = input.utilities || "";
    const roommate = input.roommate || "";
    const description = input.description || "";
    const manualTags = input.manualTags || [];
  
    const combinedText = `${title} ${school} ${location} ${type} ${furnished} ${utilities} ${roommate} ${description}`;
  
    const searchTags: string[] = [];
    const relatedTags: string[] = [];
  
    addUnique(searchTags, baseHousingTags);
  
    if (schoolTags[school]) {
      addUnique(searchTags, schoolTags[school]);
    }
  
    if (locationTags[location]) {
      addUnique(searchTags, locationTags[location]);
    } else if (location) {
      addUnique(searchTags, [location]);
    }
  
    if (typeTags[type]) {
      addUnique(searchTags, typeTags[type]);
    }
  
    if (furnishedTags[furnished]) {
      addUnique(searchTags, furnishedTags[furnished]);
    }
  
    if (roommateTags[roommate]) {
      addUnique(searchTags, roommateTags[roommate]);
    }
  
    for (const rule of utilityRules) {
      if (includesAnyKeyword(utilities, rule.keywords)) {
        addUnique(searchTags, rule.tags);
      }
    }
  
    for (const rule of featureRules) {
      if (includesAnyKeyword(combinedText, rule.keywords)) {
        addUnique(searchTags, rule.searchTags);
        addUnique(relatedTags, rule.relatedTags);
      }
    }
  
    const titleWords = title
      .split(/[\s,，。.!！?？、/]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2);
  
    addUnique(searchTags, titleWords);
  
    addUnique(searchTags, manualTags);
  
    return {
      searchTags,
      relatedTags,
    };
  }