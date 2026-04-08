import { CalendarEntry, Outfit } from "@/lib/types";
import { formatDateKey } from "@/lib/date";

type CalendarSectionProps = {
  currentMonth: string;
  entries: CalendarEntry[];
  outfits: Outfit[];
  onSaveEntry: (date: string, outfitId: string | null, memo: string) => void;
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
  outfits,
  onSaveEntry
}: CalendarSectionProps) {
  const { days, startWeekday } = buildMonthDays(currentMonth);
  const leadingEmpty = Array.from({ length: startWeekday }, (_, index) => index);
  const today = formatDateKey(new Date());

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
            <div key={`empty-${empty}`} className="h-20 rounded-2xl bg-transparent" />
          ))}
          {days.map((day) => {
            const entry = entries.find((item) => item.date === day.dateKey);
            const outfit = outfits.find((item) => item.id === entry?.outfitId);

            return (
              <button
                key={day.dateKey}
                className={`flex h-20 flex-col rounded-2xl border p-2 text-left transition ${
                  day.dateKey === today
                    ? "border-coral bg-coral/10"
                    : "border-ink/10 bg-white hover:border-coral/40"
                }`}
                onClick={() =>
                  onSaveEntry(
                    day.dateKey,
                    outfit?.id ?? outfits[0]?.id ?? null,
                    entry?.memo ?? `${day.weekday}の予定に合わせて更新`
                  )
                }
                type="button"
              >
                <span className="text-xs font-bold text-ink/60">{day.day}</span>
                <div
                  className="mt-auto rounded-xl px-2 py-1 text-[10px] font-semibold text-ink"
                  style={{ backgroundColor: outfit?.previewColor ?? "#f2eee8" }}
                >
                  {outfit?.name ?? "未登録"}
                </div>
              </button>
            );
          })}
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
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: outfit?.previewColor ?? "#d8d1c7" }}
                      />
                      <p className="text-sm font-semibold text-ink">{outfit?.name ?? "未登録"}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/65">{entry.memo}</p>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </section>
  );
}
