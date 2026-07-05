export type ListingPostType = "offer" | "request";

export type Listing = {
  id: string;
  postType: ListingPostType;
  title: string;
  price: string;
  priceValue: number;
  school: string;
  location: string;
  category: string;
  condition: string;
  pickup: string;
  seller: string;
  sellerVerified: boolean;
  tags: string[];
  description: string;
};

export const listings: Listing[] = [
  {
    id: "1",
    postType: "offer",
    title: "IKEA 白色书桌",
    price: "$45",
    priceValue: 45,
    school: "CMU",
    location: "Shadyside",
    category: "家具",
    condition: "九成新",
    pickup: "需自取",
    seller: "Gary",
    sellerVerified: true,
    tags: ["书桌", "桌子", "IKEA", "家具", "学习桌"],
    description:
      "IKEA 白色书桌，桌面很大，可以放显示器和键盘。因为搬家所以出售，需要自取。",
  },
  {
    id: "2",
    postType: "offer",
    title: "Dell 27 寸显示器",
    price: "$80",
    priceValue: 80,
    school: "CMU",
    location: "North Oakland",
    category: "电子产品",
    condition: "八成新",
    pickup: "可校内面交",
    seller: "Alex",
    sellerVerified: true,
    tags: ["显示器", "屏幕", "monitor", "Dell", "电子产品"],
    description:
      "Dell 27 寸显示器，适合学习和办公。屏幕正常，无明显划痕。",
  },
  {
    id: "3",
    postType: "offer",
    title: "Queen Size 床垫",
    price: "$60",
    priceValue: 60,
    school: "Pitt",
    location: "Oakland",
    category: "家具",
    condition: "正常使用",
    pickup: "需自取",
    seller: "Mia",
    sellerVerified: true,
    tags: ["床垫", "床", "mattress", "queen size", "家具"],
    description:
      "Queen size 床垫，正常使用，适合短期过渡或者新生刚到校使用。",
  },
  {
    id: "4",
    postType: "offer",
    title: "机械键盘",
    price: "$35",
    priceValue: 35,
    school: "CMU",
    location: "Squirrel Hill",
    category: "电子产品",
    condition: "九成新",
    pickup: "可校内面交",
    seller: "Kevin",
    sellerVerified: false,
    tags: ["键盘", "机械键盘", "keyboard", "电子产品"],
    description:
      "机械键盘，手感不错，适合写代码和学习。因为换新键盘所以出售。",
  },
  {
    id: "5",
    postType: "offer",
    title: "空气炸锅",
    price: "$25",
    priceValue: 25,
    school: "NYU",
    location: "Manhattan",
    category: "生活用品",
    condition: "八成新",
    pickup: "需自取",
    seller: "Lily",
    sellerVerified: true,
    tags: ["空气炸锅", "air fryer", "厨房", "生活用品"],
    description:
      "空气炸锅，适合宿舍或者公寓使用。功能正常，搬家出清。",
  },
  {
    id: "6",
    postType: "offer",
    title: "统计课教材",
    price: "$15",
    priceValue: 15,
    school: "Columbia",
    location: "Morningside Heights",
    category: "教材",
    condition: "正常使用",
    pickup: "可校内面交",
    seller: "Daniel",
    sellerVerified: true,
    tags: ["教材", "课本", "统计", "textbook"],
    description:
      "统计课教材，有少量笔记，不影响使用。适合统计和商科课程。",
  },
  {
    id: "7",
    postType: "request",
    title: "求一个 24 寸以上显示器",
    price: "预算 $50 内",
    priceValue: 50,
    school: "CMU",
    location: "CMU 附近",
    category: "电子产品",
    condition: "求购",
    pickup: "可自取",
    seller: "Student A",
    sellerVerified: true,
    tags: ["求购", "显示器", "monitor", "屏幕", "电子产品"],
    description:
      "求一个 24 寸以上显示器，预算 50 刀以内，CMU 附近可以自取。",
  },
  {
    id: "8",
    postType: "request",
    title: "求一个书桌或学习桌",
    price: "预算 $40 内",
    priceValue: 40,
    school: "Pitt",
    location: "Oakland",
    category: "家具",
    condition: "求购",
    pickup: "可自取",
    seller: "Student B",
    sellerVerified: true,
    tags: ["求购", "书桌", "桌子", "学习桌", "家具"],
    description:
      "求一个书桌或者学习桌，预算 40 刀以内，Oakland 附近可以自取。",
  },
];