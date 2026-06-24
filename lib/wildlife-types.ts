export type AnimalType = "snake" | "boar" | "deer" | "bee" | "bear" | "other";
export type DangerLevel = "low" | "medium" | "high";
export type PeriodFilter = "24h" | "7d" | "30d" | "all";
export type ExterminationStatus = "notCompleted" | "completed" | "unknown";
export type VerificationStatus = "未確認" | "写真あり" | "確認済み";

export type Sighting = {
  id: string;
  animal: AnimalType;
  otherName?: string;
  spottedAt: string;
  area: string;
  memo: string;
  danger: DangerLevel;
  exterminationStatus: ExterminationStatus;
  count: number;
  lat: number;
  lng: number;
  verified: VerificationStatus;
  createdAt: string;
};

export type SightingInput = Omit<Sighting, "id" | "createdAt">;
