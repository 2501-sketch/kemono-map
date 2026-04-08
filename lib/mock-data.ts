import { AppState } from "@/lib/types";

export const initialState: AppState = {
  user: {
    id: "demo-user",
    name: "Aisa",
    email: "demo@example.com",
    isLoggedIn: false
  },
  categories: [
    { id: "tops", name: "トップス" },
    { id: "bottoms", name: "ボトムス" },
    { id: "outer", name: "アウター" },
    { id: "shoes", name: "靴" },
    { id: "goods", name: "小物" }
  ],
  items: [
    {
      id: "item-1",
      name: "Cream Knit",
      categoryId: "tops",
      color: "#f5d5ae",
      note: "春向けの薄手ニット",
      imageUrl: "",
      cutoutMode: "auto",
      createdAt: "2026-04-07T10:00:00.000Z"
    },
    {
      id: "item-2",
      name: "Blue Denim",
      categoryId: "bottoms",
      color: "#6a83a8",
      note: "ワイドシルエット",
      imageUrl: "",
      cutoutMode: "original",
      createdAt: "2026-04-07T11:00:00.000Z"
    },
    {
      id: "item-3",
      name: "Leather Bag",
      categoryId: "goods",
      color: "#8a5a44",
      note: "差し色にも使いやすい",
      imageUrl: "",
      cutoutMode: "manual",
      createdAt: "2026-04-07T12:00:00.000Z"
    }
  ],
  outfits: [
    {
      id: "outfit-1",
      name: "Cafe Casual",
      note: "落ち着いたトーンでまとめた日",
      previewColor: "#ffe5da",
      createdAt: "2026-04-07T12:30:00.000Z",
      updatedAt: "2026-04-07T12:30:00.000Z",
      layers: [
        {
          id: "layer-1",
          itemId: "item-1",
          x: 30,
          y: 30,
          scale: 1,
          rotation: -4,
          zIndex: 1
        },
        {
          id: "layer-2",
          itemId: "item-2",
          x: 40,
          y: 145,
          scale: 1.1,
          rotation: 2,
          zIndex: 2
        },
        {
          id: "layer-3",
          itemId: "item-3",
          x: 170,
          y: 128,
          scale: 0.85,
          rotation: 8,
          zIndex: 3
        }
      ]
    }
  ],
  calendarEntries: [
    {
      date: "2026-04-08",
      outfitId: "outfit-1",
      memo: "友達とランチ。歩きやすさ重視。"
    }
  ]
};
