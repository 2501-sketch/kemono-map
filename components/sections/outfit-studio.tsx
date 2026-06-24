import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { ClothingItem, Outfit, OutfitLayer } from "@/lib/types";

type OutfitStudioProps = {
  canUndo: boolean;
  items: ClothingItem[];
  outfits: Outfit[];
  registerDate: string;
  selectedOutfit: Outfit;
  onChangeRegisterDate: (date: string) => void;
  onChangeOutfitMeta: (updates: Pick<Outfit, "name" | "note">) => void;
  onDeleteLayer: (layerId: string) => void;
  onSelectOutfit: (outfitId: string) => void;
  onAddLayer: (itemId: string, position?: { x: number; y: number }) => void;
  onRegisterToCalendar: () => void;
  onUpdateLayer: (layerId: string, updater: (layer: OutfitLayer) => OutfitLayer) => void;
  onUndo: () => void;
  onSaveOutfit: () => void;
};

type PointerDrag =
  | {
      type: "palette";
      itemId: string;
      label: string;
      pointerId: number;
      pointerX: number;
      pointerY: number;
    }
  | {
      type: "layer";
      layerId: string;
      pointerId: number;
      offsetX: number;
      offsetY: number;
    };

function layerLabel(item: ClothingItem | undefined) {
  return item?.name ?? "Unknown";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function OutfitStudio({
  canUndo,
  items,
  outfits,
  registerDate,
  selectedOutfit,
  onChangeRegisterDate,
  onChangeOutfitMeta,
  onDeleteLayer,
  onSelectOutfit,
  onAddLayer,
  onRegisterToCalendar,
  onUpdateLayer,
  onUndo,
  onSaveOutfit
}: OutfitStudioProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<PointerDrag | null>(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(selectedOutfit.layers.at(-1)?.id ?? null);
  const orderedLayers = selectedOutfit.layers.slice().sort((a, b) => a.zIndex - b.zIndex);
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );
  const selectedLayer = selectedOutfit.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedLayerItem = selectedLayer ? itemMap.get(selectedLayer.itemId) : undefined;

  useEffect(() => {
    if (!selectedOutfit.layers.some((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(selectedOutfit.layers.at(-1)?.id ?? null);
    }
  }, [selectedLayerId, selectedOutfit.layers]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      if (dragState.type === "palette") {
        setDragState((current) =>
          current && current.type === "palette"
            ? {
                ...current,
                pointerX: event.clientX,
                pointerY: event.clientY
              }
            : current
        );
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const nextX = clamp(event.clientX - bounds.left - dragState.offsetX, 0, Math.max(bounds.width - 72, 0));
      const nextY = clamp(event.clientY - bounds.top - dragState.offsetY, 0, Math.max(bounds.height - 72, 0));

      onUpdateLayer(dragState.layerId, (current) => ({
        ...current,
        x: nextX,
        y: nextY
      }));
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      if (dragState.type === "palette") {
        const canvas = canvasRef.current;
        if (canvas) {
          const bounds = canvas.getBoundingClientRect();
          const insideCanvas =
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom;

          if (insideCanvas) {
            onAddLayer(dragState.itemId, {
              x: clamp(event.clientX - bounds.left - 48, 0, Math.max(bounds.width - 96, 0)),
              y: clamp(event.clientY - bounds.top - 48, 0, Math.max(bounds.height - 96, 0))
            });
          }
        }
      }

      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, onAddLayer, onUpdateLayer]);

  useEffect(() => {
    if (!saveNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaveNotice(""), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [saveNotice]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-moss">Studio</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">コーデ作成</h2>
        </div>
        <div className="flex items-center gap-2">
          {canUndo ? (
            <button
              className="pill-button border border-ink/10 bg-white text-ink hover:bg-paper"
              onClick={onUndo}
              type="button"
            >
              元に戻す
            </button>
          ) : (
            <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink/45">
              編集すると元に戻せます
            </span>
          )}
          <button
            className="pill-button bg-coral text-white hover:opacity-90"
            onClick={() => {
              onSaveOutfit();
              setSaveNotice("保存しました");
            }}
            type="button"
          >
            保存する
          </button>
        </div>
      </div>
      {saveNotice ? <p className="text-sm font-semibold text-moss">{saveNotice}</p> : null}

      <div className="card-surface p-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
          {outfits.map((outfit) => (
            <button
              key={outfit.id}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                outfit.id === selectedOutfit.id ? "bg-ink text-white" : "bg-white text-ink/70 border border-black/10"
              }`}
              onClick={() => onSelectOutfit(outfit.id)}
              type="button"
            >
              {outfit.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface p-4">
        <div className="grid gap-3">
          <div>
            <p className="text-sm font-bold text-ink">コーデ名</p>
            <input
              className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
              onChange={(event) =>
                onChangeOutfitMeta({
                  name: event.target.value,
                  note: selectedOutfit.note
                })
              }
              placeholder="たとえば 春のおでかけ"
              value={selectedOutfit.name}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">メモ</p>
            <textarea
              className="mt-2 min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
              onChange={(event) =>
                onChangeOutfitMeta({
                  name: selectedOutfit.name,
                  note: event.target.value
                })
              }
              placeholder="このコーデのポイント"
              value={selectedOutfit.note}
            />
          </div>
        </div>
      </div>

      <div className="card-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">登録したい日付</p>
            <input
              className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
              onChange={(event) => onChangeRegisterDate(event.target.value)}
              type="date"
              value={registerDate}
            />
          </div>
          <button
            className="pill-button bg-ink text-white hover:bg-ink/90"
            onClick={() => {
              onRegisterToCalendar();
              setSaveNotice("カレンダーに登録しました");
            }}
            type="button"
          >
            この日付に登録
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_0.8fr]">
        <div className="card-surface p-4">
          <div
            ref={canvasRef}
            className="relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-[30px] border border-black/10 bg-white"
          >
            <div className="absolute inset-5 rounded-[26px] border border-dashed border-black/10" />
            {orderedLayers.map((layer) => {
              const item = itemMap.get(layer.itemId);

              return (
                <button
                  key={layer.id}
                  className={`absolute touch-none overflow-visible bg-transparent text-center text-sm font-bold text-ink transition hover:scale-[1.01] ${
                    selectedLayerId === layer.id ? "drop-shadow-[0_0_0.4rem_rgba(0,0,0,0.35)]" : ""
                  }`}
                  onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    setSelectedLayerId(layer.id);
                    setDragState({
                      type: "layer",
                      layerId: layer.id,
                      pointerId: event.pointerId,
                      offsetX: event.clientX - bounds.left,
                      offsetY: event.clientY - bounds.top
                    });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  style={{
                    left: layer.x,
                    top: layer.y,
                    width: `${96 * layer.scale}px`,
                    height: `${96 * layer.scale}px`,
                    transform: `rotate(${layer.rotation}deg)`,
                    zIndex: layer.zIndex
                  }}
                  type="button"
                >
                  {item?.imageUrl ? (
                    <img
                      alt={item.name}
                      className="h-full w-full object-contain"
                      draggable={false}
                      src={item.imageUrl}
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center px-3 ${
                        selectedLayerId === layer.id ? "rounded-[28px] ring-2 ring-black/30" : ""
                      }`}
                      style={{
                        background: `linear-gradient(160deg, ${item?.color ?? "#ddd"} 0%, rgba(255,255,255,0.95) 100%)`
                      }}
                    >
                      {layerLabel(item)}
                    </div>
                  )}
                </button>
              );
            })}
            {selectedLayer && (
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="mx-auto flex max-w-sm items-center justify-between rounded-full border border-black/10 bg-white px-3 py-2 shadow-lg">
                  <div className="min-w-0 px-2">
                    <p className="truncate text-sm font-bold text-ink">
                      {layerLabel(selectedLayerItem)}
                    </p>
                    <p className="text-xs text-ink/50">選択中の画像をその場で調整</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-paper px-3 py-2 text-xs font-bold text-ink"
                      onClick={() =>
                        onUpdateLayer(selectedLayer.id, (current) => ({
                          ...current,
                          scale: Math.max(0.35, Number((current.scale - 0.1).toFixed(2)))
                        }))
                      }
                      type="button"
                    >
                      -
                    </button>
                    <button
                      className="rounded-full bg-paper px-3 py-2 text-xs font-bold text-ink"
                      onClick={() =>
                        onUpdateLayer(selectedLayer.id, (current) => ({
                          ...current,
                          scale: Number((current.scale + 0.1).toFixed(2))
                        }))
                      }
                      type="button"
                    >
                      +
                    </button>
                    <button
                      className="rounded-full bg-ink px-3 py-2 text-xs font-bold text-white"
                      onClick={() => {
                        onDeleteLayer(selectedLayer.id);
                        setSelectedLayerId(null);
                      }}
                      type="button"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/60">
            下の服カードをドラッグしてキャンバスに追加できます。配置後の服もそのままドラッグして動かせます。
          </p>
        </div>

        <div className="space-y-4">
          <div className="card-surface p-4">
            <h3 className="text-lg font-bold text-ink">服を追加</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  className="rounded-[24px] border border-ink/10 p-3 text-left transition hover:border-black/30 hover:bg-paper"
                  onPointerDown={(event: PointerEvent<HTMLButtonElement>) =>
                    setDragState({
                      type: "palette",
                      itemId: item.id,
                      label: item.name,
                      pointerId: event.pointerId,
                      pointerX: event.clientX,
                      pointerY: event.clientY
                    })
                  }
                  type="button"
                >
                  <div className="flex h-20 items-center justify-center overflow-hidden rounded-[18px] bg-white">
                    {item.imageUrl ? (
                      <img
                        alt={item.name}
                        className="h-full w-full object-contain p-2"
                        draggable={false}
                        src={item.imageUrl}
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{
                          background: `linear-gradient(160deg, ${item.color} 0%, rgba(255,255,255,0.92) 100%)`
                        }}
                      />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{item.name}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/55">
              スマホでは長押し気味に動かすと入れやすいです。
            </p>
          </div>
          <div className="card-surface p-4">
            <h3 className="text-lg font-bold text-ink">レイヤー調整</h3>
            <div className="mt-4 space-y-3">
              {orderedLayers.map((layer) => {
                const item = itemMap.get(layer.itemId);

                return (
                  <div
                    key={layer.id}
                    className={`rounded-[24px] p-3 ${
                      selectedLayerId === layer.id ? "bg-black/5 ring-1 ring-black/20" : "bg-paper"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        className="text-left text-sm font-bold text-ink"
                        onClick={() => setSelectedLayerId(layer.id)}
                        type="button"
                      >
                        {layerLabel(item)}
                      </button>
                      <span className="text-xs font-semibold text-ink/45">z{layer.zIndex}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                        onClick={() =>
                          onUpdateLayer(layer.id, (current) => ({
                            ...current,
                            scale: Number((current.scale + 0.1).toFixed(2))
                          }))
                        }
                        type="button"
                      >
                        拡大
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                        onClick={() =>
                          onUpdateLayer(layer.id, (current) => ({
                            ...current,
                            scale: Math.max(0.5, Number((current.scale - 0.1).toFixed(2)))
                          }))
                        }
                        type="button"
                      >
                        縮小
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                        onClick={() =>
                          onUpdateLayer(layer.id, (current) => ({
                            ...current,
                            rotation: current.rotation - 10
                          }))
                        }
                        type="button"
                      >
                        左回転
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                        onClick={() =>
                          onUpdateLayer(layer.id, (current) => ({
                            ...current,
                            rotation: current.rotation + 10
                          }))
                        }
                        type="button"
                      >
                        右回転
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                        onClick={() =>
                          onUpdateLayer(layer.id, (current) => ({
                            ...current,
                            zIndex: current.zIndex + 1
                          }))
                        }
                        type="button"
                      >
                        前面へ
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                        onClick={() => {
                          onDeleteLayer(layer.id);
                          if (selectedLayerId === layer.id) {
                            setSelectedLayerId(null);
                          }
                        }}
                        type="button"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {dragState?.type === "palette" && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-[60] w-24 -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-white/80 bg-white/90 p-2 shadow-2xl"
          style={{
            transform: `translate(${dragState.pointerX - 48}px, ${dragState.pointerY - 48}px)`
          }}
        >
          <div className="flex h-20 items-center justify-center overflow-hidden rounded-[18px] bg-paper text-center text-xs font-bold text-ink">
            {itemMap.get(dragState.itemId)?.imageUrl ? (
              <img
                alt={dragState.label}
                className="h-full w-full object-contain p-2"
                src={itemMap.get(dragState.itemId)?.imageUrl}
              />
            ) : (
              dragState.label
            )}
          </div>
        </div>
      )}
    </section>
  );
}
