"use client";

import { FormEvent, PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  addSharedSighting,
  deleteSharedSighting,
  trySubscribeToSharedSightings,
  updateSharedSightingExterminationStatus
} from "@/lib/wildlife-firestore";
import {
  AnimalType,
  DangerLevel,
  ExterminationStatus,
  PeriodFilter,
  Sighting,
  SightingInput
} from "@/lib/wildlife-types";

type MapTile = {
  key: string;
  url: string;
  left: number;
  top: number;
  size: number;
};

const tileSize = 256;
const minZoom = 12;
const maxZoom = 18;
const kamiyamaCenter = { lat: 33.9675, lng: 134.3513 };
const kamiyamaBounds = {
  north: 34.055,
  south: 33.87,
  east: 134.495,
  west: 134.235
};

const animalMeta: Record<
  AnimalType,
  { label: string; color: string; bg: string; text: string; icon: string }
> = {
  snake: { label: "蛇", color: "#dc2626", bg: "#fee2e2", text: "#991b1b", icon: "S" },
  boar: { label: "イノシシ", color: "#f97316", bg: "#ffedd5", text: "#9a3412", icon: "I" },
  deer: { label: "シカ", color: "#16a34a", bg: "#dcfce7", text: "#166534", icon: "D" },
  bee: { label: "蜂", color: "#9333ea", bg: "#f3e8ff", text: "#6b21a8", icon: "H" },
  bear: { label: "くま", color: "#2563eb", bg: "#dbeafe", text: "#1e40af", icon: "B" },
  other: { label: "その他", color: "#6b7280", bg: "#f3f4f6", text: "#374151", icon: "O" }
};

const dangerMeta: Record<DangerLevel, { label: string; className: string }> = {
  low: { label: "低", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  medium: { label: "中", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  high: { label: "高", className: "bg-rose-50 text-rose-700 ring-rose-200" }
};

const exterminationMeta: Record<ExterminationStatus, { label: string; className: string }> = {
  notCompleted: { label: "未駆除", className: "bg-rose-50 text-rose-700 ring-rose-200" },
  completed: { label: "駆除済み", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  unknown: { label: "不明", className: "bg-zinc-50 text-zinc-700 ring-zinc-200" }
};

const initialSightings: Sighting[] = [];

type SyncMode = "checking" | "shared" | "local";

function getInitialDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isWithinPeriod(value: string, period: PeriodFilter) {
  if (period === "all") {
    return true;
  }

  const hours = period === "24h" ? 24 : period === "7d" ? 24 * 7 : 24 * 30;
  const elapsed = Date.now() - new Date(value).getTime();

  return elapsed <= hours * 60 * 60 * 1000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampToKamiyama(position: { lat: number; lng: number }) {
  return {
    lat: clamp(position.lat, kamiyamaBounds.south, kamiyamaBounds.north),
    lng: clamp(position.lng, kamiyamaBounds.west, kamiyamaBounds.east)
  };
}

function latLngToWorld(lat: number, lng: number, zoom: number) {
  const scale = tileSize * 2 ** zoom;
  const sinLat = Math.sin((clamp(lat, -85.0511, 85.0511) * Math.PI) / 180);

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function worldToLatLng(x: number, y: number, zoom: number) {
  const scale = tileSize * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return {
    lat: clamp(lat, -85.0511, 85.0511),
    lng: clamp(lng, -180, 180)
  };
}

function buildTiles(center: { lat: number; lng: number }, zoom: number, size: { width: number; height: number }) {
  const tileZoom = Math.floor(zoom);
  const zoomScale = 2 ** (zoom - tileZoom);
  const centerWorld = latLngToWorld(center.lat, center.lng, tileZoom);
  const startX = centerWorld.x - size.width / (2 * zoomScale);
  const startY = centerWorld.y - size.height / (2 * zoomScale);
  const firstTileX = Math.floor(startX / tileSize);
  const firstTileY = Math.floor(startY / tileSize);
  const lastTileX = Math.floor((startX + size.width / zoomScale) / tileSize);
  const lastTileY = Math.floor((startY + size.height / zoomScale) / tileSize);
  const tileCount = 2 ** tileZoom;
  const tiles: MapTile[] = [];

  for (let x = firstTileX; x <= lastTileX; x += 1) {
    for (let y = firstTileY; y <= lastTileY; y += 1) {
      if (y < 0 || y >= tileCount) {
        continue;
      }

      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${tileZoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${tileZoom}/${wrappedX}/${y}.png`,
        left: (x * tileSize - startX) * zoomScale,
        top: (y * tileSize - startY) * zoomScale,
        size: tileSize * zoomScale
      });
    }
  }

  return tiles;
}

function getAnimalLabel(sighting: Pick<Sighting, "animal" | "otherName">) {
  if (sighting.animal === "other" && sighting.otherName?.trim()) {
    return sighting.otherName.trim();
  }

  return animalMeta[sighting.animal].label;
}

function escapeCsvCell(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function MapPin({
  color,
  label,
  selected
}: {
  color: string;
  label: string;
  selected?: boolean;
}) {
  return (
    <span className="relative flex -translate-x-1/2 -translate-y-full flex-col items-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white text-xs font-black text-white shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
        style={{
          backgroundColor: color,
          outline: selected ? "4px solid rgba(23, 32, 24, 0.34)" : "none"
        }}
      >
        <span className="h-3 w-3 rounded-full bg-white" />
      </span>
      <span
        className="-mt-2 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-white shadow-[6px_6px_12px_rgba(0,0,0,0.18)]"
        style={{ backgroundColor: color }}
      />
      <span className="mt-1 max-w-24 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold leading-tight text-[#172018] shadow-card">
        {label}
      </span>
    </span>
  );
}

function getScreenPoint(
  position: { lat: number; lng: number },
  center: { lat: number; lng: number },
  zoom: number,
  size: { width: number; height: number }
) {
  const point = latLngToWorld(position.lat, position.lng, zoom);
  const centerPoint = latLngToWorld(center.lat, center.lng, zoom);

  return {
    x: point.x - centerPoint.x + size.width / 2,
    y: point.y - centerPoint.y + size.height / 2
  };
}

export function WildlifeMapApp() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; center: { lat: number; lng: number } } | null>(null);
  const [mapSize, setMapSize] = useState({ width: 860, height: 520 });
  const [mapCenter, setMapCenter] = useState(kamiyamaCenter);
  const [zoom, setZoom] = useState(13);
  const [draftPosition, setDraftPosition] = useState(kamiyamaCenter);
  const [sightings, setSightings] = useState<Sighting[]>(initialSightings);
  const [syncMode, setSyncMode] = useState<SyncMode>("checking");
  const [syncMessage, setSyncMessage] = useState("共有データベースを確認中");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [animalFilter, setAnimalFilter] = useState<AnimalType | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [dangerFilter, setDangerFilter] = useState<DangerLevel | "all">("all");
  const [form, setForm] = useState({
    animal: "snake" as AnimalType,
    spottedAt: getInitialDateTime(),
    area: "",
    memo: "",
    otherName: "",
    danger: "medium" as DangerLevel,
    exterminationStatus: "notCompleted" as ExterminationStatus,
    count: 1,
    verified: "未確認" as Sighting["verified"]
  });

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setMapSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(mapRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mapElement = mapRef.current;

    if (!mapElement) {
      return;
    }

    const preventMapScroll = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      moveZoom(zoom + clamp(-event.deltaY / 260, -0.45, 0.45));
    };

    mapElement.addEventListener("wheel", preventMapScroll, { passive: false });

    return () => {
      mapElement.removeEventListener("wheel", preventMapScroll);
    };
  }, [zoom]);

  useEffect(() => {
    const unsubscribe = trySubscribeToSharedSightings({
      onData: (sharedSightings) => {
        setSightings(sharedSightings);
        setSyncMode("shared");
        setSyncMessage("共有データベースに接続中");
      },
      onError: () => {
        setSyncMode("local");
        setSyncMessage("Firebase未設定のため、この端末だけに保存");
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const filteredSightings = useMemo(
    () =>
      sightings
        .filter((sighting) => animalFilter === "all" || sighting.animal === animalFilter)
        .filter((sighting) => dangerFilter === "all" || sighting.danger === dangerFilter)
        .filter((sighting) => isWithinPeriod(sighting.spottedAt, periodFilter))
        .sort((a, b) => new Date(b.spottedAt).getTime() - new Date(a.spottedAt).getTime()),
    [animalFilter, dangerFilter, periodFilter, sightings]
  );

  const selectedSighting =
    filteredSightings.find((sighting) => sighting.id === selectedId) ?? null;

  const highPrioritySightings = filteredSightings.filter(
    (sighting) => sighting.danger === "high" || sighting.animal === "bear"
  );
  const tiles = useMemo(() => buildTiles(mapCenter, zoom, mapSize), [mapCenter, mapSize, zoom]);
  const draftPoint = getScreenPoint(draftPosition, mapCenter, zoom, mapSize);

  const setDraftFromPointer = (clientX: number, clientY: number) => {
    if (!mapRef.current) {
      return;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const centerWorld = latLngToWorld(mapCenter.lat, mapCenter.lng, zoom);
    const nextWorldX = centerWorld.x + clientX - rect.left - rect.width / 2;
    const nextWorldY = centerWorld.y + clientY - rect.top - rect.height / 2;
    const nextPosition = clampToKamiyama(worldToLatLng(nextWorldX, nextWorldY, zoom));

    setDraftPosition(nextPosition);
  };

  const moveZoom = (nextZoom: number) => {
    setZoom(Number(clamp(nextZoom, minZoom, maxZoom).toFixed(2)));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      center: mapCenter
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return;
    }

    const startCenterWorld = latLngToWorld(
      dragRef.current.center.lat,
      dragRef.current.center.lng,
      zoom
    );
    const nextCenterWorld = {
      x: startCenterWorld.x - (event.clientX - dragRef.current.x),
      y: startCenterWorld.y - (event.clientY - dragRef.current.y)
    };

    setMapCenter(clampToKamiyama(worldToLatLng(nextCenterWorld.x, nextCenterWorld.y, zoom)));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag) {
      return;
    }

    const moved = Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y);
    if (moved < 5) {
      setDraftFromPointer(event.clientX, event.clientY);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const nextSightingInput: SightingInput = {
      animal: form.animal,
      otherName: form.animal === "other" ? form.otherName.trim() : undefined,
      spottedAt: form.spottedAt,
      area: form.area.trim() || "場所未入力",
      memo: form.memo.trim() || "詳細メモなし",
      danger: form.danger,
      exterminationStatus: form.exterminationStatus,
      count: Number(form.count) || 1,
      lat: draftPosition.lat,
      lng: draftPosition.lng,
      verified: form.verified
    };

    try {
      if (syncMode === "shared") {
        const id = await addSharedSighting(nextSightingInput);
        setSelectedId(id);
      } else {
        const nextLocalSighting: Sighting = {
          ...nextSightingInput,
          id: `sighting-${Date.now()}`,
          createdAt: new Date().toISOString()
        };

        setSightings((current) => [nextLocalSighting, ...current]);
        setSelectedId(nextLocalSighting.id);
      }

      setAnimalFilter("all");
      setPeriodFilter("all");
      setForm((current) => ({
        ...current,
        area: "",
        memo: "",
        otherName: "",
        count: 1
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateExterminationStatus = async (
    sighting: Sighting,
    exterminationStatus: ExterminationStatus
  ) => {
    if (syncMode === "shared") {
      await updateSharedSightingExterminationStatus(sighting.id, exterminationStatus);
      return;
    }

    setSightings((current) =>
      current.map((item) =>
        item.id === sighting.id ? { ...item, exterminationStatus } : item
      )
    );
  };

  const handleDeleteSighting = async (sighting: Sighting) => {
    const shouldDelete = window.confirm(`${getAnimalLabel(sighting)}の投稿を削除しますか？`);

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      if (syncMode === "shared") {
        await deleteSharedSighting(sighting.id);
      } else {
        setSightings((current) => current.filter((item) => item.id !== sighting.id));
      }

      setSelectedId(null);
    } catch {
      setDeleteError("削除できませんでした。FirebaseのFirestoreルールが更新されているか確認してください。");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "目撃日時",
      "動物",
      "場所",
      "数",
      "危険度",
      "駆除状況",
      "確認状況",
      "状況メモ",
      "緯度",
      "経度",
      "登録日時"
    ];
    const rows = [...sightings]
      .sort((a, b) => new Date(b.spottedAt).getTime() - new Date(a.spottedAt).getTime())
      .map((sighting) => [
        sighting.spottedAt,
        getAnimalLabel(sighting),
        sighting.area,
        sighting.count,
        dangerMeta[sighting.danger].label,
        exterminationMeta[sighting.exterminationStatus].label,
        sighting.verified,
        sighting.memo,
        sighting.lat,
        sighting.lng,
        sighting.createdAt
      ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .format(new Date())
      .replaceAll("/", "-");

    link.href = url;
    link.download = `けものマップ_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#172018]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:px-6">
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
            <p className="text-sm font-bold text-[#2f6f4e]">けものマップ</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight">神山町の野生動物出現を確認</h1>
            <p className="mt-3 text-sm leading-6 text-[#5a6659]">
              地図範囲は神山町内に固定しています。地点を選んで、これから投稿していけます。
            </p>
            <div
              className={`mt-4 rounded-md px-3 py-2 text-xs font-bold ${
                syncMode === "shared"
                  ? "bg-emerald-50 text-emerald-700"
                  : syncMode === "checking"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {syncMessage}
            </div>
            <button
              className="mt-3 w-full rounded-md border border-[#aebba8] bg-white px-3 py-2 text-sm font-bold text-[#2f6f4e] transition hover:bg-[#f1f6ed] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={syncMode === "checking" || sightings.length === 0}
              onClick={handleExportCsv}
              type="button"
            >
              CSVを書き出す
            </button>
            <p className="mt-2 text-xs leading-5 text-[#5a6659]">
              全{sightings.length}件をGoogleスプレッドシートで開ける形式にします。
            </p>
          </section>

          <section className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold">表示フィルター</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-xs font-bold text-[#5a6659]">
                動物
                <select
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-sm text-[#172018]"
                  value={animalFilter}
                  onChange={(event) => setAnimalFilter(event.target.value as AnimalType | "all")}
                >
                  <option value="all">すべて</option>
                  {Object.entries(animalMeta).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-[#5a6659]">
                期間
                <select
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-sm text-[#172018]"
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                >
                  <option value="24h">24時間以内</option>
                  <option value="7d">7日以内</option>
                  <option value="30d">30日以内</option>
                  <option value="all">すべて</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-[#5a6659]">
                危険度
                <select
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-sm text-[#172018]"
                  value={dangerFilter}
                  onChange={(event) => setDangerFilter(event.target.value as DangerLevel | "all")}
                >
                  <option value="all">すべて</option>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold">凡例</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(animalMeta).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-2 rounded-md bg-[#f8faf6] px-2 py-2 text-sm">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden="true"
                  />
                  {meta.label}
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
              <p className="text-xs font-bold text-[#5a6659]">表示中</p>
              <p className="mt-1 text-3xl font-bold">{filteredSightings.length}</p>
            </div>
            <div className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
              <p className="text-xs font-bold text-[#5a6659]">高警戒</p>
              <p className="mt-1 text-3xl font-bold">{highPrioritySightings.length}</p>
            </div>
            <div className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
              <p className="text-xs font-bold text-[#5a6659]">最新</p>
              <p className="mt-2 text-sm font-bold">
                {filteredSightings[0] ? formatDateTime(filteredSightings[0].spottedAt) : "未登録"}
              </p>
            </div>
          </div>

          <div
            ref={mapRef}
            className="relative min-h-[520px] touch-none overflow-hidden rounded-lg border border-[#cfd8c8] bg-[#d9e5d2] shadow-card"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            role="application"
            aria-label="投稿地点を選ぶ地図"
          >
            {tiles.map((tile) => (
              <img
                key={tile.key}
                alt=""
                className="absolute select-none transition-[height,left,top,width] duration-150 ease-out"
                draggable={false}
                src={tile.url}
                style={{ left: tile.left, top: tile.top, height: tile.size, width: tile.size }}
              />
            ))}

            {filteredSightings.map((sighting) => {
              const meta = animalMeta[sighting.animal];
              const isSelected = selectedSighting?.id === sighting.id;
              const point = getScreenPoint(sighting, mapCenter, zoom, mapSize);

              if (point.x < -40 || point.y < -40 || point.x > mapSize.width + 40 || point.y > mapSize.height + 40) {
                return null;
              }

              return (
                <button
                  key={sighting.id}
                  className="absolute transition-[left,top,transform] duration-150 ease-out hover:scale-105"
                  style={{
                    left: point.x,
                    top: point.y
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(sighting.id);
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  title={`${getAnimalLabel(sighting)}: ${sighting.area}`}
                >
                  <MapPin color={meta.color} label={getAnimalLabel(sighting)} selected={isSelected} />
                </button>
              );
            })}

            <div
              className="absolute transition-[left,top] duration-150 ease-out"
              style={{ left: draftPoint.x, top: draftPoint.y }}
            >
              <MapPin color="#172018" label="投稿地点" />
            </div>

            <div
              className="absolute left-4 top-4 flex flex-col overflow-hidden rounded-md border border-[#cfd8c8] bg-white shadow-card"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              <button className="h-10 w-10 border-b border-[#d8ddcf] text-xl font-bold" onClick={() => moveZoom(zoom + 1)} type="button">
                +
              </button>
              <button className="h-10 w-10 text-xl font-bold" onClick={() => moveZoom(zoom - 1)} type="button">
                -
              </button>
            </div>

            <button
              className="absolute right-4 top-4 rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-xs font-bold shadow-card"
              onClick={() => {
                setMapCenter(draftPosition);
                setZoom(15);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              type="button"
            >
              投稿地点へ
            </button>

            <div className="absolute bottom-4 left-4 max-w-[300px] rounded-lg border border-[#d8ddcf] bg-white/95 p-3 text-xs leading-5 text-[#5a6659] shadow-card">
              神山町内をドラッグで移動、+/-またはホイールで拡大縮小。クリックした場所が新規投稿地点になります。
            </div>

            <a
              className="absolute bottom-2 right-3 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-[#334238]"
              href="https://www.openstreetmap.org/copyright"
              rel="noreferrer"
              target="_blank"
            >
              © OpenStreetMap
            </a>
          </div>

          <section className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">最新の目撃情報</h2>
              <span className="text-xs font-bold text-[#5a6659]">{filteredSightings.length}件</span>
            </div>
            {filteredSightings.length === 0 ? (
              <p className="mt-3 rounded-md bg-[#f8faf6] p-3 text-sm text-[#5a6659]">
                まだ目撃情報はありません。右のフォームから最初の投稿を追加できます。
              </p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {filteredSightings.map((sighting) => {
                  const meta = animalMeta[sighting.animal];

                  return (
                    <button
                      key={sighting.id}
                      className="rounded-lg border border-[#d8ddcf] bg-[#fbfcf8] p-3 text-left transition hover:border-[#8ba878]"
                      onClick={() => {
                        setSelectedId(sighting.id);
                        setMapCenter({ lat: sighting.lat, lng: sighting.lng });
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md px-2 py-1 text-sm font-bold" style={{ backgroundColor: meta.bg, color: meta.text }}>
                          {getAnimalLabel(sighting)}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${dangerMeta[sighting.danger].className}`}>
                          危険度{dangerMeta[sighting.danger].label}
                        </span>
                      </div>
                      <p className="mt-3 font-bold">{sighting.area}</p>
                      <p className="mt-1 text-sm text-[#5a6659]">
                        {formatDateTime(sighting.spottedAt)}・{sighting.count}件・{exterminationMeta[sighting.exterminationStatus].label}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold">選択中の詳細</h2>
            {selectedSighting ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="rounded-md px-3 py-2 text-sm font-bold"
                    style={{
                      backgroundColor: animalMeta[selectedSighting.animal].bg,
                      color: animalMeta[selectedSighting.animal].text
                    }}
                  >
                    {getAnimalLabel(selectedSighting)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${dangerMeta[selectedSighting.danger].className}`}>
                    危険度{dangerMeta[selectedSighting.danger].label}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold">{selectedSighting.area}</h3>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-[#f8faf6] p-3">
                    <dt className="text-xs font-bold text-[#5a6659]">日時</dt>
                    <dd className="mt-1 font-bold">{formatDateTime(selectedSighting.spottedAt)}</dd>
                  </div>
                  <div className="rounded-md bg-[#f8faf6] p-3">
                    <dt className="text-xs font-bold text-[#5a6659]">数</dt>
                    <dd className="mt-1 font-bold">{selectedSighting.count}件</dd>
                  </div>
                  <div className="rounded-md bg-[#f8faf6] p-3">
                    <dt className="text-xs font-bold text-[#5a6659]">信頼度</dt>
                    <dd className="mt-1 font-bold">{selectedSighting.verified}</dd>
                  </div>
                  <div className="rounded-md bg-[#f8faf6] p-3">
                    <dt className="text-xs font-bold text-[#5a6659]">駆除状況</dt>
                    <dd className="mt-2">
                      <select
                        className="w-full rounded-md border border-[#cfd8c8] bg-white px-2 py-2 text-sm font-bold"
                        value={selectedSighting.exterminationStatus}
                        onChange={(event) =>
                          void handleUpdateExterminationStatus(
                            selectedSighting,
                            event.target.value as ExterminationStatus
                          )
                        }
                      >
                        <option value="notCompleted">未駆除</option>
                        <option value="completed">駆除済み</option>
                        <option value="unknown">不明</option>
                      </select>
                    </dd>
                  </div>
                  <div className="rounded-md bg-[#f8faf6] p-3">
                    <dt className="text-xs font-bold text-[#5a6659]">緯度経度</dt>
                    <dd className="mt-1 font-bold">
                      {selectedSighting.lat.toFixed(5)}, {selectedSighting.lng.toFixed(5)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 rounded-md bg-[#f8faf6] p-3 text-sm leading-6 text-[#334238]">{selectedSighting.memo}</p>
                {deleteError ? (
                  <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-700">
                    {deleteError}
                  </p>
                ) : null}
                <button
                  className="mt-4 w-full rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteSighting(selectedSighting)}
                  type="button"
                >
                  {isDeleting ? "削除中" : "この投稿を削除"}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#5a6659]">まだ選択できる目撃情報がありません。</p>
            )}
          </section>

          <section className="rounded-lg border border-[#d8ddcf] bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold">新しい目撃情報を投稿</h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <label className="block text-xs font-bold text-[#5a6659]">
                動物
                <select
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-sm"
                  value={form.animal}
                  onChange={(event) => setForm((current) => ({ ...current, animal: event.target.value as AnimalType }))}
                >
                  {Object.entries(animalMeta).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>

              {form.animal === "other" ? (
                <label className="block text-xs font-bold text-[#5a6659]">
                  動物名
                  <input
                    className="mt-2 w-full rounded-md border border-[#cfd8c8] px-3 py-2 text-sm"
                    value={form.otherName}
                    onChange={(event) => setForm((current) => ({ ...current, otherName: event.target.value }))}
                    placeholder="例：キツネ、タヌキ、鳥など"
                  />
                </label>
              ) : null}

              <label className="block text-xs font-bold text-[#5a6659]">
                日時
                <input
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] px-3 py-2 text-sm"
                  type="datetime-local"
                  value={form.spottedAt}
                  onChange={(event) => setForm((current) => ({ ...current, spottedAt: event.target.value }))}
                />
              </label>

              <label className="block text-xs font-bold text-[#5a6659]">
                場所
                <input
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] px-3 py-2 text-sm"
                  value={form.area}
                  onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
                  placeholder="場所名や目印を入力"
                />
              </label>

              <div className="rounded-md bg-[#f8faf6] p-3 text-xs leading-5 text-[#5a6659]">
                投稿地点: {draftPosition.lat.toFixed(5)}, {draftPosition.lng.toFixed(5)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-[#5a6659]">
                  数
                  <input
                    className="mt-2 w-full rounded-md border border-[#cfd8c8] px-3 py-2 text-sm"
                    min={1}
                    type="number"
                    value={form.count}
                    onChange={(event) => setForm((current) => ({ ...current, count: Number(event.target.value) }))}
                  />
                </label>
                <label className="block text-xs font-bold text-[#5a6659]">
                  危険度
                  <select
                    className="mt-2 w-full rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-sm"
                    value={form.danger}
                    onChange={(event) => setForm((current) => ({ ...current, danger: event.target.value as DangerLevel }))}
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-bold text-[#5a6659]">
                駆除状況
                <select
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-sm"
                  value={form.exterminationStatus}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      exterminationStatus: event.target.value as ExterminationStatus
                    }))
                  }
                >
                  <option value="notCompleted">未駆除</option>
                  <option value="completed">駆除済み</option>
                  <option value="unknown">不明</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-[#5a6659]">
                信頼度
                <select
                  className="mt-2 w-full rounded-md border border-[#cfd8c8] bg-white px-3 py-2 text-sm"
                  value={form.verified}
                  onChange={(event) => setForm((current) => ({ ...current, verified: event.target.value as Sighting["verified"] }))}
                >
                  <option value="未確認">未確認</option>
                  <option value="写真あり">写真あり</option>
                  <option value="確認済み">確認済み</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-[#5a6659]">
                状況メモ
                <textarea
                  className="mt-2 min-h-20 w-full resize-none rounded-md border border-[#cfd8c8] px-3 py-2 text-sm"
                  value={form.memo}
                  onChange={(event) => setForm((current) => ({ ...current, memo: event.target.value }))}
                  placeholder="道路を横切っていた、畑付近にいた、など"
                />
              </label>

              <button
                className="w-full rounded-md bg-[#172018] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2f6f4e] disabled:cursor-not-allowed disabled:bg-[#7f887f]"
                disabled={isSubmitting || syncMode === "checking"}
              >
                {isSubmitting ? "投稿中" : "投稿する"}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
