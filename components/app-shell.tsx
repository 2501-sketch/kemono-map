"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarSection } from "@/components/sections/calendar-section";
import { ClosetSection } from "@/components/sections/closet-section";
import { LoginPanel } from "@/components/sections/login-panel";
import { OutfitStudio } from "@/components/sections/outfit-studio";
import { SettingsSection } from "@/components/sections/settings-section";
import { MobileNav } from "@/components/mobile-nav";
import { formatDateKey, formatMonthKey } from "@/lib/date";
import { initialState } from "@/lib/mock-data";
import { loadState, saveState } from "@/lib/storage";
import { AppState, AppTab, ClothingItem, Outfit, OutfitLayer } from "@/lib/types";

function createLayer(itemId: string, length: number, position?: { x: number; y: number }): OutfitLayer {
  return {
    id: `layer-${Date.now()}-${length}`,
    itemId,
    x: position?.x ?? 24 + length * 18,
    y: position?.y ?? 24 + length * 28,
    scale: 1.45,
    rotation: length % 2 === 0 ? -4 : 4,
    zIndex: length + 1
  };
}

function createItemFromFile(
  file: File,
  index: number,
  categories: AppState["categories"],
  imageUrl: string
): ClothingItem {
  const baseName = file.name.replace(/\.[^.]+$/, "");

  return {
    id: `item-${Date.now()}-${index}`,
    name: baseName || `Uploaded Item ${index + 1}`,
    categoryId: categories[0]?.id ?? "tops",
    color: "#e9d7c3",
    note: `${file.name} を登録`,
    imageUrl,
    cutoutMode: "original",
    createdAt: new Date().toISOString()
  };
}

function cloneOutfitSnapshot(outfit: Outfit) {
  const timestamp = Date.now();

  return {
    ...outfit,
    id: `outfit-${timestamp}`,
    name: outfit.name.trim() || "名前なしコーデ",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: outfit.layers.map((layer, index) => ({
      ...layer,
      id: `layer-${timestamp}-${index}`
    }))
  };
}

function upsertCalendarEntry(
  entries: AppState["calendarEntries"],
  nextEntry: AppState["calendarEntries"][number]
) {
  return entries.some((entry) => entry.date === nextEntry.date)
    ? entries.map((entry) => (entry.date === nextEntry.date ? nextEntry : entry))
    : [...entries, nextEntry];
}

export function AppShell() {
  const [state, setState] = useState<AppState>(initialState);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [hydrated, setHydrated] = useState(false);
  const [currentMonth] = useState(() => formatMonthKey(new Date()));
  const [registerDate, setRegisterDate] = useState(() => formatDateKey(new Date()));
  const [selectedOutfitId, setSelectedOutfitId] = useState(initialState.outfits[0].id);
  const [studioHistory, setStudioHistory] = useState<Record<string, Outfit[]>>({});

  useEffect(() => {
    let active = true;

    void loadState().then((saved) => {
      if (!active) {
        return;
      }

      setState(saved);
      setSelectedOutfitId(saved.outfits[0]?.id ?? initialState.outfits[0].id);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void saveState(state);
  }, [hydrated, state]);

  const selectedOutfit = useMemo(
    () => state.outfits.find((outfit) => outfit.id === selectedOutfitId) ?? state.outfits[0],
    [selectedOutfitId, state.outfits]
  );

  const canUndoStudio = (studioHistory[selectedOutfitId] ?? []).length > 0;

  const applyToSelectedOutfit = (updater: (outfit: Outfit) => Outfit) => {
    let previousOutfit: Outfit | null = null;

    setState((current) => {
      const nextOutfits = current.outfits.map((outfit) => {
        if (outfit.id !== selectedOutfitId) {
          return outfit;
        }

        previousOutfit = JSON.parse(JSON.stringify(outfit)) as Outfit;
        return updater(outfit);
      });

      return {
        ...current,
        outfits: nextOutfits
      };
    });

    if (previousOutfit) {
      setStudioHistory((current) => ({
        ...current,
        [selectedOutfitId]: [...(current[selectedOutfitId] ?? []), previousOutfit as Outfit].slice(-30)
      }));
    }
  };

  const handleUndoStudio = () => {
    const history = studioHistory[selectedOutfitId] ?? [];
    const previousOutfit = history[history.length - 1];

    if (!previousOutfit) {
      return;
    }

    setState((current) => ({
      ...current,
      outfits: current.outfits.map((outfit) =>
        outfit.id === selectedOutfitId ? previousOutfit : outfit
      )
    }));
    setStudioHistory((current) => ({
      ...current,
      [selectedOutfitId]: history.slice(0, -1)
    }));
  };

  const handleUploadItems = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const uploadedItems = await Promise.all(
      Array.from(files).map(
        (file, index) =>
          new Promise<ClothingItem>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(createItemFromFile(file, index, state.categories, String(reader.result ?? "")));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );

    setState((current) => ({
      ...current,
      items: [...uploadedItems, ...current.items]
    }));
  };

  if (!state.user.isLoggedIn) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
        <LoginPanel
          onLogin={() =>
            setState((current) => ({
              ...current,
              user: {
                ...current.user,
                isLoggedIn: true
              }
            }))
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6">
      <div className="mx-auto max-w-md lg:max-w-none">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-coral">Coordi Closet</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">今日のコーデを、すばやく決める</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink/65">
              服を登録して、並べて、保存して、カレンダーへ。MVPで必要な流れを一画面ずつ確認できる初期版です。
            </p>
          </div>
          <div className="hidden rounded-[28px] bg-white/80 px-5 py-4 text-right shadow-card lg:block">
            <p className="text-sm font-semibold text-ink/45">{state.user.name}</p>
            <p className="mt-1 text-lg font-bold text-ink">{state.items.length} clothes</p>
          </div>
        </header>

        <div className="space-y-8">
          {activeTab === "home" && (
            <CalendarSection
              currentMonth={currentMonth}
              entries={state.calendarEntries}
              items={state.items}
              outfits={state.outfits}
              onDeleteEntry={(date) =>
                setState((current) => ({
                  ...current,
                  calendarEntries: current.calendarEntries.filter((entry) => entry.date !== date)
                }))
              }
              onSaveEntry={(date, outfitId, memo) =>
                setState((current) => {
                  const existing = current.calendarEntries.find((entry) => entry.date === date);
                  const sourceOutfit = current.outfits.find((outfit) => outfit.id === outfitId);
                  const shouldClone = Boolean(
                    sourceOutfit && (!existing || existing.outfitId !== outfitId)
                  );
                  const snapshot = sourceOutfit && shouldClone ? cloneOutfitSnapshot(sourceOutfit) : null;
                  const nextEntry = {
                    date,
                    outfitId: snapshot?.id ?? outfitId,
                    memo
                  };

                  return {
                    ...current,
                    outfits: snapshot ? [...current.outfits, snapshot] : current.outfits,
                    calendarEntries: upsertCalendarEntry(current.calendarEntries, nextEntry)
                  };
                })
              }
              onUpdateOutfitMeta={(outfitId, updates) =>
                setState((current) => ({
                  ...current,
                  outfits: current.outfits.map((outfit) =>
                    outfit.id === outfitId ? { ...outfit, ...updates } : outfit
                  )
                }))
              }
            />
          )}

          {activeTab === "closet" && (
            <ClosetSection
              categories={state.categories}
              items={state.items}
              onAddCategory={(name) =>
                setState((current) => ({
                  ...current,
                  categories: [
                    ...current.categories,
                    { id: `category-${Date.now()}`, name }
                  ]
                }))
              }
              onDeleteCategory={(categoryId) =>
                setState((current) => {
                  if (current.categories.length <= 1) {
                    return current;
                  }

                  const remainingCategories = current.categories.filter((category) => category.id !== categoryId);
                  const fallbackCategoryId = remainingCategories[0]?.id ?? current.categories[0].id;

                  return {
                    ...current,
                    categories: remainingCategories,
                    items: current.items.map((item) =>
                      item.categoryId === categoryId ? { ...item, categoryId: fallbackCategoryId } : item
                    )
                  };
                })
              }
              onUploadItems={(files) => {
                void handleUploadItems(files);
              }}
              onUpdateCategory={(categoryId, name) =>
                setState((current) => ({
                  ...current,
                  categories: current.categories.map((category) =>
                    category.id === categoryId ? { ...category, name } : category
                  )
                }))
              }
              onDeleteItem={(itemId) =>
                setState((current) => ({
                  ...current,
                  items: current.items.filter((item) => item.id !== itemId),
                  outfits: current.outfits.map((outfit) => ({
                    ...outfit,
                    layers: outfit.layers.filter((layer) => layer.itemId !== itemId)
                  }))
                }))
              }
              onUpdateItem={(itemId, updates) =>
                setState((current) => ({
                  ...current,
                  items: current.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
                }))
              }
            />
          )}

          {activeTab === "studio" && selectedOutfit && (
            <OutfitStudio
              canUndo={canUndoStudio}
              items={state.items}
              outfits={state.outfits}
              registerDate={registerDate}
              selectedOutfit={selectedOutfit}
              onChangeRegisterDate={setRegisterDate}
              onChangeOutfitMeta={(updates) =>
                setState((current) => ({
                  ...current,
                  outfits: current.outfits.map((outfit) =>
                    outfit.id === selectedOutfit.id ? { ...outfit, ...updates } : outfit
                  )
                }))
              }
              onSelectOutfit={setSelectedOutfitId}
              onDeleteLayer={(layerId) =>
                applyToSelectedOutfit((outfit) => ({
                  ...outfit,
                  updatedAt: new Date().toISOString(),
                  layers: outfit.layers.filter((layer) => layer.id !== layerId)
                }))
              }
              onAddLayer={(itemId, position) =>
                applyToSelectedOutfit((outfit) => ({
                  ...outfit,
                  updatedAt: new Date().toISOString(),
                  layers: [...outfit.layers, createLayer(itemId, outfit.layers.length, position)]
                }))
              }
              onRegisterToCalendar={() =>
                setState((current) => {
                  const sourceOutfit =
                    current.outfits.find((outfit) => outfit.id === selectedOutfit.id) ?? selectedOutfit;
                  const snapshot = cloneOutfitSnapshot(sourceOutfit);
                  const nextEntry = {
                    date: registerDate,
                    outfitId: snapshot.id,
                    memo:
                      current.calendarEntries.find((entry) => entry.date === registerDate)?.memo ||
                      selectedOutfit.note
                  };

                  return {
                    ...current,
                    outfits: [...current.outfits, snapshot],
                    calendarEntries: upsertCalendarEntry(current.calendarEntries, nextEntry)
                  };
                })
              }
              onUpdateLayer={(layerId, updater) =>
                applyToSelectedOutfit((outfit) => ({
                  ...outfit,
                  updatedAt: new Date().toISOString(),
                  layers: outfit.layers.map((layer) => (layer.id === layerId ? updater(layer) : layer))
                }))
              }
              onUndo={handleUndoStudio}
              onSaveOutfit={() =>
                setState((current) => ({
                  ...current,
                  outfits: current.outfits.map((outfit) =>
                    outfit.id === selectedOutfit.id
                      ? {
                          ...outfit,
                          name: outfit.name.trim() || "名前なしコーデ",
                          updatedAt: new Date().toISOString()
                        }
                      : outfit
                  )
                }))
              }
            />
          )}

          {activeTab === "settings" && (
            <SettingsSection
              user={state.user}
              itemCount={state.items.length}
              outfitCount={state.outfits.length}
              onLogout={() =>
                setState((current) => ({
                  ...current,
                  user: {
                    ...current.user,
                    isLoggedIn: false
                  }
                }))
              }
            />
          )}
        </div>
      </div>
      <MobileNav activeTab={activeTab} onChange={setActiveTab} />
    </main>
  );
}
