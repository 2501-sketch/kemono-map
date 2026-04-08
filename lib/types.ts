export type AppTab = "home" | "closet" | "studio" | "settings";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
};

export type ClothingCategory = {
  id: string;
  name: string;
};

export type ClothingItem = {
  id: string;
  name: string;
  categoryId: string;
  color: string;
  note: string;
  imageUrl: string;
  cutoutMode: "original" | "auto" | "manual";
  createdAt: string;
};

export type OutfitLayer = {
  id: string;
  itemId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

export type Outfit = {
  id: string;
  name: string;
  note: string;
  previewColor: string;
  layers: OutfitLayer[];
  createdAt: string;
  updatedAt: string;
};

export type CalendarEntry = {
  date: string;
  outfitId: string | null;
  memo: string;
};

export type AppState = {
  user: UserProfile;
  categories: ClothingCategory[];
  items: ClothingItem[];
  outfits: Outfit[];
  calendarEntries: CalendarEntry[];
};
