# Coordi Closet

服の登録、コーデ作成、カレンダー記録をまとめたスマホ向けWebアプリの初期版です。

## 技術構成

- Next.js App Router
- React
- Tailwind CSS
- Firebase連携用の設定雛形
- ローカルストレージによるMVPデモ保存

## できること

- デモログイン
- 服アイテムの一覧表示と追加
- カテゴリの追加
- コーデ画面でのレイヤー追加、拡大縮小、回転、前面移動
- カレンダーへのコーデ割り当て
- 設定画面からの状態確認

## セットアップ

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くと確認できます。

Node.js と npm が入っていない環境では、先にNode.js 20系以降を導入してください。

## Firebase接続

1. `.env.example` を `.env.local` にコピー
2. Firebaseプロジェクトの値を設定
3. 認証・Firestore・Storageの接続ロジックを `lib/firebase.ts` から拡張

現状はUI検証を優先しているため、データ保存は `localStorage` を利用しています。

## 今後の優先実装

1. Firebase Authenticationによる本ログイン
2. Storageへの画像アップロード
3. remove.bg APIまたは類似処理による自動切り抜き
4. Canvasベースの手動切り抜き
5. コーデ画像エクスポート
