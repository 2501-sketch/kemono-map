import { useEffect, useMemo, useState } from "react";
import { OutfitBoardPreview } from "@/components/outfit-board-preview";
import { CalendarEntry, ClothingItem, Outfit } from "@/lib/types";
import { formatDateKey } from "@/lib/date";

type CalendarSectionProps = {
  currentMonth: string;
  entries: CalendarEntry[];
  items: ClothingItem[];
  outfits: Outfit[];
  onDeleteEntry: (date: string) => void;
  onSaveEntry: (date: string, outfitId: string | null, memo: string) => void;
  onUpdateOutfitMeta: (outfitId: string, updates: Pick<Outfit, "name" | "note">) => void;
};

function buildMonthDays(currentMonth: string) {
  const [year, month] = currentMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days = [];

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month - 1, day);
      days.push({
      dateKey: formatDateKey(date),
      day,
      weekday: ["日", "月", "火", "水", "木", "金", "土"][date.getDay()]
    });
  }

  return {
    days,
    startWeekday: firstDay.getDay()
  };
}

export function CalendarSection({
  currentMonth,
  entries,
  items,
  outfits,
  onDeleteEntry,
  onSaveEntry,
  onUpdateOutfitMeta
}: CalendarSectionProps) {
  const { days, startWeekday } = buildMonthDays(currentMonth);
  const leadingEmpty = Array.from({ length: startWeekday }, (_, index) => index);
  const today = formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.date === selectedDate),
    [entries, selectedDate]
  );
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | "">("");
  const [memo, setMemo] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const selectedOutfit = outfits.find((outfit) => outfit.id === selectedOutfitId);
  const [draftOutfitName, setDraftOutfitName] = useState("");
  const [draftOutfitNote, setDraftOutfitNote] = useState("");

  useEffect(() => {
    const activeOutfitId = selectedEntry?.outfitId ?? outfits[0]?.id ?? "";
    setSelectedOutfitId(activeOutfitId);
    setMemo(selectedEntry?.memo ?? "");
    const activeOutfit = outfits.find((outfit) => outfit.id === activeOutfitId);
    setDraftOutfitName(activeOutfit?.name ?? "");
    setDraftOutfitNote(activeOutfit?.note ?? "");
    setIsEditing(false);
  }, [outfits, selectedEntry]);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-moss">Calendar</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">今月のコーデ記録</h2>
        </div>
        <div className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-ink/70">
          {currentMonth}
        </div>
      </div>
      <div className="card-surface p-4">
        <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-ink/50">
          {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {leadingEmpty.map((empty) => (
            <div key={`empty-${empty}`} className="h-48 rounded-2xl bg-transparent" />
          ))}
          {days.map((day) => {
            const entry = entries.find((item) => item.date === day.dateKey);
            const outfit = outfits.find((item) => item.id === entry?.outfitId);
            const isSelected = day.dateKey === selectedDate;

            return (
              <button
                key={day.dateKey}
                className={`flex h-48 flex-col rounded-2xl border p-2 text-left transition ${
                  isSelected
                    ? "border-black bg-black text-white"
                    : day.dateKey === today
                      ? "border-black bg-white"
                      : "border-black/10 bg-white hover:border-black/40"
                }`}
                onClick={() => setSelectedDate(day.dateKey)}
                type="button"
              >
                <span className={`text-xs font-bold ${isSelected ? "text-white/80" : "text-ink/60"}`}>{day.day}</span>
                {outfit ? (
                  <div className="mt-1 flex flex-1 items-center justify-center overflow-hidden">
                    <OutfitBoardPreview
                      bare
                      className="h-full max-h-[9.6rem] w-auto max-w-full aspect-[3/4]"
                      items={items}
                      outfit={outfit}
                    />
                  </div>
                ) : (
                  <div
                    className={`mt-auto rounded-xl px-2 py-1 text-[10px] font-semibold ${
                      isSelected ? "bg-white text-black" : "bg-paper text-ink"
                    }`}
                  >
                    未登録
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="card-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">日付ごとの登録</h3>
            <p className="mt-1 text-sm text-ink/60">{selectedDate} のコーデとメモを保存できます。</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedEntry ? (
              <button
                className="pill-button border border-black/10 bg-white text-ink hover:bg-paper"
                onClick={() => setIsEditing((current) => !current)}
                type="button"
              >
                {isEditing ? "編集を閉じる" : "編集"}
              </button>
            ) : null}
            {selectedEntry ? (
              <button
                className="pill-button border border-black/10 bg-white text-ink hover:bg-paper"
                onClick={() => onDeleteEntry(selectedDate)}
                type="button"
              >
                削除
              </button>
            ) : null}
            <button
              className="pill-button bg-ink text-white hover:bg-ink/90"
              onClick={() => onSaveEntry(selectedDate, selectedOutfitId || null, memo)}
              type="button"
            >
              カレンダーに保存
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[24px] bg-paper p-3">
            {selectedOutfit ? (
              <OutfitBoardPreview
                className="aspect-[3/4] w-full rounded-[20px]"
                items={items}
                outfit={selectedOutfit}
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-[20px] bg-white text-sm text-ink/45">
                コーデ画像は未保存です
              </div>
            )}
          </div>
          <div className="grid gap-3">
            {isEditing ? (
              <>
                <select
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const nextOutfit = outfits.find((outfit) => outfit.id === nextId);
                    setSelectedOutfitId(nextId);
                    setDraftOutfitName(nextOutfit?.name ?? "");
                    setDraftOutfitNote(nextOutfit?.note ?? "");
                  }}
                  value={selectedOutfitId}
                >
                  {outfits.map((outfit) => (
                    <option key={outfit.id} value={outfit.id}>
                      {outfit.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                  onChange={(event) => setDraftOutfitName(event.target.value)}
                  placeholder="コーデ名"
                  value={draftOutfitName}
                />
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                  onChange={(event) => setDraftOutfitNote(event.target.value)}
                  placeholder="コーデのメモ"
                  value={draftOutfitNote}
                />
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-coral"
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="その日のメモ"
                  value={memo}
                />
                <button
                  className="pill-button bg-ink text-white hover:bg-ink/90"
                  onClick={() => {
                    if (selectedOutfitId) {
                      onUpdateOutfitMeta(selectedOutfitId, {
                        name: draftOutfitName.trim() || "名前なしコーデ",
                        note: draftOutfitNote
                      });
                    }
                    onSaveEntry(selectedDate, selectedOutfitId || null, memo);
                    setIsEditing(false);
                  }}
                  type="button"
                >
                  編集内容を保存
                </button>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                  <p className="text-sm font-bold text-ink">{selectedOutfit?.name ?? "未登録"}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/60">
                    {selectedOutfit?.note || "コーデのメモはまだありません。"}
                  </p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                  <p className="text-sm font-bold text-ink">その日のメモ</p>
                  <p className="mt-2 text-sm leading-6 text-ink/60">
                    {memo || "この日のメモはまだありません。"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="card-surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">最近のメモ</h3>
          <span className="text-xs font-semibold text-ink/50">タップで当日のコーデを登録</span>
        </div>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-ink/60">まだ記録がありません。</p>
          ) : (
            entries
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)
              .map((entry) => {
                const outfit = outfits.find((item) => item.id === entry.outfitId);

                return (
                  <div key={entry.date} className="rounded-2xl bg-paper px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/40">
                      {entry.date}
                    </p>
                    <div className="mt-2 flex items-start gap-3">
                      {outfit ? (
                        <OutfitBoardPreview
                          className="h-16 w-16 rounded-2xl"
                          items={items}
                          outfit={outfit}
                        />
                      ) : (
                        <span
                          className="mt-1 inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: "#d8d1c7" }}
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-ink">{outfit?.name ?? "未登録"}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/65">{entry.memo}</p>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </section>
  );
}
