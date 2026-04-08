import { UserProfile } from "@/lib/types";

type SettingsSectionProps = {
  user: UserProfile;
  itemCount: number;
  outfitCount: number;
  onLogout: () => void;
};

export function SettingsSection({
  user,
  itemCount,
  outfitCount,
  onLogout
}: SettingsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-moss">Settings</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">設定</h2>
      </div>
      <div className="card-surface p-5">
        <p className="text-sm text-ink/50">アカウント</p>
        <h3 className="mt-2 text-xl font-bold text-ink">{user.name}</h3>
        <p className="text-sm text-ink/60">{user.email}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">服数</p>
            <p className="mt-2 text-3xl font-bold text-ink">{itemCount}</p>
          </div>
          <div className="rounded-[24px] bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">保存コーデ</p>
            <p className="mt-2 text-3xl font-bold text-ink">{outfitCount}</p>
          </div>
        </div>
      </div>
      <div className="card-surface p-5">
        <h3 className="text-lg font-bold text-ink">クラウド同期準備</h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/65">
          <li>Firebase Authenticationでメールログインに置き換え可能</li>
          <li>Firestoreへ服・コーデ・カレンダーを保存する構成を用意済み</li>
          <li>Storageに透過PNGや元画像を保存する想定</li>
        </ul>
      </div>
      <button
        className="pill-button w-full border border-ink/10 bg-white text-ink hover:bg-paper"
        onClick={onLogout}
        type="button"
      >
        ログアウト
      </button>
    </section>
  );
}
