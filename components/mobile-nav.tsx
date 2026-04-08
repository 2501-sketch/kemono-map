import { AppTab } from "@/lib/types";

type MobileNavProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: { id: AppTab; label: string; icon: string }[] = [
  { id: "home", label: "ホーム", icon: "01" },
  { id: "closet", label: "服一覧", icon: "02" },
  { id: "studio", label: "作成", icon: "03" },
  { id: "settings", label: "設定", icon: "04" }
];

export function MobileNav({ activeTab, onChange }: MobileNavProps) {
  return (
    <nav className="card-surface fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between px-3 py-2">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 transition ${
              active ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/5"
            }`}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <span className="text-[10px] font-bold tracking-[0.24em]">{tab.icon}</span>
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
