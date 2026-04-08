import { useEffect, useMemo, useState } from "react";
import { ClothingCategory, ClothingItem } from "@/lib/types";

type ClosetSectionProps = {
  categories: ClothingCategory[];
  items: ClothingItem[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onUploadItems: (files: FileList | null) => void;
  onUpdateCategory: (categoryId: string, name: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<ClothingItem>) => void;
};

export function ClosetSection({
  categories,
  items,
  onAddCategory,
  onDeleteCategory,
  onUploadItems,
  onUpdateCategory,
  onDeleteItem,
  onUpdateItem
}: ClosetSectionProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftCategoryName, setDraftCategoryName] = useState("");

  const filteredItems = useMemo(
    () =>
      selectedCategoryId === "all"
        ? items
        : items.filter((item) => item.categoryId === selectedCategoryId),
    [items, selectedCategoryId]
  );

  useEffect(() => {
    if (selectedCategoryId !== "all" && !categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId("all");
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (editingItemId && !items.some((item) => item.id === editingItemId)) {
      setEditingItemId(null);
    }
  }, [editingItemId, items]);

  useEffect(() => {
    const activeCategory = categories.find((category) => category.id === selectedCategoryId);
    setDraftCategoryName(activeCategory?.name ?? "");
  }, [categories, selectedCategoryId]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-moss">Closet</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">服の管理</h2>
        </div>
        <label className="pill-button bg-ink text-white hover:bg-ink/90">
          画像を追加
          <input
            accept="image/*"
            className="hidden"
            multiple
            onChange={(event) => {
              onUploadItems(event.target.files);
              event.currentTarget.value = "";
            }}
            type="file"
          />
        </label>
      </div>
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden pb-1">
          <button
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
              selectedCategoryId === "all" ? "bg-ink text-white" : "bg-paper text-ink/65"
            }`}
            onClick={() => setSelectedCategoryId("all")}
            type="button"
          >
            すべて
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                selectedCategoryId === category.id ? "bg-ink text-white" : "bg-paper text-ink/65"
              }`}
              onClick={() => setSelectedCategoryId(category.id)}
              type="button"
            >
              {category.name}
            </button>
          ))}
          <button
            className="whitespace-nowrap rounded-full border border-dashed border-ink/20 px-4 py-2 text-xs font-semibold text-ink/60"
            onClick={() => onAddCategory(`カテゴリ${categories.length + 1}`)}
            type="button"
          >
            + カテゴリ追加
          </button>
        </div>
      </div>
      <div className="card-surface p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-ink">カテゴリ管理</h3>
              <p className="mt-1 text-sm text-ink/60">カテゴリをタップすると、名前変更や削除ができます。</p>
            </div>
            {selectedCategoryId !== "all" && (
              <button
                className="rounded-full border border-ink/10 px-4 py-2 text-xs font-semibold text-ink"
                onClick={() => onDeleteCategory(selectedCategoryId)}
                type="button"
              >
                カテゴリ削除
              </button>
            )}
          </div>
          {selectedCategoryId === "all" ? (
            <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink/60">
              編集したいカテゴリを上のチップから選んでください。
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                onChange={(event) => setDraftCategoryName(event.target.value)}
                placeholder="カテゴリ名"
                value={draftCategoryName}
              />
              <button
                className="pill-button bg-ink text-white hover:bg-ink/90"
                onClick={() => onUpdateCategory(selectedCategoryId, draftCategoryName.trim() || "未分類")}
                type="button"
              >
                名前を保存
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredItems.map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);
          const isEditing = editingItemId === item.id;

          return (
            <article
              key={item.id}
              className={`card-surface overflow-hidden p-4 transition ${
                isEditing ? "ring-2 ring-coral/40" : ""
              }`}
            >
              <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,#fbf6ee_0%,#f0e7d7_100%)]">
                {item.imageUrl ? (
                  <img
                    alt={item.name}
                    className="h-full w-full object-contain p-3"
                    src={item.imageUrl}
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(160deg, ${item.color} 0%, rgba(255,255,255,0.95) 100%)`
                    }}
                  />
                )}
                <div className="absolute bottom-3 left-3 rounded-full bg-white/78 px-4 py-2 text-xs font-bold text-ink/70">
                  {item.cutoutMode === "auto" ? "AI切り抜き" : item.cutoutMode === "manual" ? "手動調整" : "原画像"}
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-ink">{item.name}</h3>
                  <p className="text-sm text-ink/55">{category?.name ?? "未分類"}</p>
                </div>
                <span
                  className="mt-1 inline-block h-4 w-4 rounded-full border border-white"
                  style={{ backgroundColor: item.color }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/65">{item.note}</p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white"
                  onClick={() => setEditingItemId(isEditing ? null : item.id)}
                  type="button"
                >
                  {isEditing ? "閉じる" : "編集"}
                </button>
                <button
                  className="rounded-full border border-ink/10 px-4 py-2 text-xs font-semibold text-ink"
                  onClick={() => onDeleteItem(item.id)}
                  type="button"
                >
                  削除
                </button>
              </div>
              {isEditing && (
                <div className="mt-4 grid gap-3 rounded-[24px] bg-paper p-4">
                  <input
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                    onChange={(event) => onUpdateItem(item.id, { name: event.target.value })}
                    placeholder="服の名前"
                    value={item.name}
                  />
                  <select
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                    onChange={(event) => onUpdateItem(item.id, { categoryId: event.target.value })}
                    value={item.categoryId}
                  >
                    {categories.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                    onChange={(event) => onUpdateItem(item.id, { note: event.target.value })}
                    placeholder="メモ"
                    value={item.note}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>
      {filteredItems.length === 0 && (
        <div className="card-surface p-6 text-sm leading-6 text-ink/60">
          このカテゴリにはまだ服がありません。上の「画像を追加」から登録できます。
        </div>
      )}
    </section>
  );
}
