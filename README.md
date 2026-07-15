# けものマップ

神山町内で見かけた野生動物の情報を、地図上のピンとして共有できるWebアプリです。  
「いつ・どこで・何を見たか」を投稿し、ほかの人が投稿した目撃情報も同じ地図上で確認できます。

## アプリの概要

このアプリは、神山町での野生動物の出現情報を地域内で共有することを目的に作りました。  
地図の範囲は神山町周辺に固定し、拡大・縮小・ドラッグ移動をしながら、目撃地点を選んで投稿できます。

投稿されたデータはFirebase Firestoreに保存され、公開URLにアクセスした人同士で同じ情報を確認できます。Firebaseの設定がない環境では、端末内だけのローカル保存として動きます。

## 主な機能

- 神山町内に固定した地図表示
- 地図の拡大、縮小、ドラッグ移動
- 地図上のクリック位置を投稿地点として選択
- 野生動物の種類別ピン表示
- 目撃日時、場所名、頭数、危険度、メモの登録
- 「その他」を選んだときの動物名の自由入力
- 駆除状況の登録と更新
- 投稿の削除
- 動物、期間、危険度での絞り込み
- くま・危険度高の情報を優先表示
- 投稿データのCSV書き出し
- Firebase Firestoreによる共有データ保存

## 動物ごとの色

| 動物 | 色 |
| --- | --- |
| 蛇 | 赤 |
| イノシシ | オレンジ |
| シカ | 緑 |
| 蜂 | 紫 |
| くま | 青 |
| その他 | グレー |

## 実行方法

### 1. 依存ライブラリをインストール

```bash
npm install
```

### 2. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

Firebaseを使って共有保存する場合は、`.env.local` にFirebaseのWebアプリ設定を入れます。

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebaseを設定しない場合でもアプリは起動しますが、投稿はその端末だけに保存されます。

### 3. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで次のURLを開きます。

```text
http://localhost:3000
```

### 4. 本番用ビルド確認

```bash
npm run build
```

## Firebaseの設定

共有データとして使う場合は、Firebase側で次の準備が必要です。

1. Firebaseプロジェクトを作成
2. Webアプリを追加
3. Firestore Databaseを作成
4. Firebase Authenticationで匿名ログインを有効化
5. `.env.local` またはVercelのEnvironment VariablesにFirebase設定を追加
6. `firestore.rules` の内容をFirestoreルールに反映

Firestoreでは `wildlifeSightings` コレクションに目撃情報を保存します。

## 使用したデータ

- 初期データや架空データはソースコード内に入れていません。
- 投稿データは、ユーザーがアプリ上から入力した野生動物の目撃情報です。
- 授業内ワークシートから整理した登録データは `data/wildlife-sightings.json` にまとめています。
- `data/wildlife-sightings.json` には、緯度経度が確認できたデータのみを入れ、個人名は入れていません。
- 地図画像にはOpenStreetMapのタイルを利用しています。

## 技術構成

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Firebase Firestore
- Firebase Authentication
- OpenStreetMap
- Vercel

## 主なライブラリ

| ライブラリ | 用途 | ライセンス |
| --- | --- | --- |
| Next.js | Webアプリのフレームワーク | MIT License |
| React | UI構築 | MIT License |
| Firebase JS SDK | Firestore、Authentication連携 | Apache License 2.0 |
| Tailwind CSS | スタイリング | MIT License |
| TypeScript | 型付きJavaScript | Apache License 2.0 |

OpenStreetMapの地図データはOpenStreetMap contributorsによるものです。地図データはOpen Database Licenseに基づきます。

## ライセンス

このリポジトリには、現時点で独自の `LICENSE` ファイルは追加していません。  
授業提出用の制作物として作成しています。公開利用や再配布を行う場合は、用途に合わせてライセンスファイルを追加してください。
