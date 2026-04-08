type LoginPanelProps = {
  onLogin: () => void;
};

export function LoginPanel({ onLogin }: LoginPanelProps) {
  return (
    <section className="card-surface grain relative overflow-hidden p-6">
      <div className="relative z-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-coral">Welcome</p>
        <h1 className="max-w-xs text-3xl font-bold leading-tight text-ink">
          今日のコーデを、迷わず決めるためのクローゼット。
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink/70">
          服の登録、自由配置、保存、カレンダー記録までをスマホで完結。まずはデモログインで体験できます。
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="pill-button bg-ink text-white hover:bg-ink/90"
            onClick={onLogin}
            type="button"
          >
            デモでログイン
          </button>
          <button className="pill-button border border-ink/10 bg-white text-ink" type="button">
            メールアドレスで始める
          </button>
        </div>
      </div>
    </section>
  );
}
