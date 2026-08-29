[English](README.md) | [简体中文](README.zh-CN.md) | **日本語**

<div align="center">
  <a href="https://nitrostack.ai">
    <img src="logo.png" alt="NitroStack" width="120" />
  </a>

  <h1>NitroStack</h1>

  <p><strong>本番対応の MCP サーバーを構築するためのエンタープライズ級 TypeScript フレームワーク。</strong></p>
  <p>デコレーター、依存性注入、Widget。AI ネイティブなバックエンドを出荷するための一つのフレームワークです。</p>

  <br />

  <a href="https://www.npmjs.com/package/@nitrostack/core"><img src="https://img.shields.io/npm/v/@nitrostack/core?style=flat-square&label=%40nitrostack%2Fcore&color=cb0000" alt="npm バージョン" /></a>
  <a href="https://www.npmjs.com/package/@nitrostack/core"><img src="https://img.shields.io/npm/dm/@nitrostack/core?style=flat-square&color=cb0000" alt="npm ダウンロード数" /></a>
  <a href="https://github.com/nitrocloudofficial/nitrostack"><img src="https://img.shields.io/github/stars/nitrocloudofficial/nitrostack?style=flat-square&color=cb0000" alt="GitHub スター" /></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square" alt="ライセンス" /></a>
  <a href="https://discord.gg/uVWey6UhuD"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord コミュニティに参加" /></a>
  <a href="https://x.com/nitrostackai"><img src="https://img.shields.io/badge/Follow-000000?style=flat-square&logo=x&logoColor=white" alt="X をフォロー" /></a>
  <a href="https://www.youtube.com/@nitrostackai"><img src="https://img.shields.io/badge/YouTube-Subscribe-FF0000?style=flat-square&logo=youtube&logoColor=white" alt="YouTube を購読" /></a>
  <a href="https://linkedin.com/company/nitrostack-ai/"><img src="https://img.shields.io/badge/LinkedIn-Follow-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn をフォロー" /></a>
  <a href="https://github.com/nitrostackai"><img src="https://img.shields.io/badge/GitHub-Organization-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub Organization" /></a>

  <br />
  <br />

  <a href="https://docs.nitrostack.ai"><strong>ドキュメント</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://docs.nitrostack.ai/quick-start"><strong>クイックスタート</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://blog.nitrostack.ai"><strong>ブログ</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://nitrostack.ai/studio"><strong>NitroStudio</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://discord.gg/uVWey6UhuD"><strong>Discord</strong></a>

  <br />
  <br />
</div>

---

## クイックスタート

### 前提条件

- **Node.js** >= 20.18（[ダウンロード](https://nodejs.org/)）
- **npm** >= 9

### 1. 新しいプロジェクトを作成する

```bash
npx @nitrostack/cli init my-server
```

![NitroStack CLI](assets/gif/nitrocli.gif)

### 2. 開発を始める

```bash
cd my-server
npm install
npm run dev
```

MCP サーバーが起動しました。MCP 互換クライアントに接続してください。

### 3. NitroStudio で開く

プロジェクトを作成したら、同じフォルダーを NitroStudio で開き、視覚的なテストとデバッグを行います。

- ダウンロード：<https://nitrostack.ai/studio>
- `my-server` プロジェクトフォルダーを開く
- NitroStudio でツールをテストし、ペイロードを確認し、MCP サーバーとチャットする

## NitroStack を選ぶ理由

現在 MCP サーバーを構築するには、定型コードをつなぎ合わせ、認証を一から作り直し、ツール群が拡張に耐えることを期待しなければなりません。NitroStack は、方針が明確で必要な機能を備えたフレームワークを提供し、サーバーが本来行う仕事に集中できるようにします。

- **デコレーター駆動** — 明快で宣言的な TypeScript デコレーターを使って、ツール、リソース、プロンプトを定義
- **依存性注入** — シングルトン、一時、スコープ付きライフサイクルを備えた第一級の DI コンテナー
- **組み込み認証** — JWT、OAuth 2.1、API キー認証を標準搭載
- **ミドルウェアパイプライン** — エンタープライズバックエンドと同様の Guard、Interceptor、Pipe、例外フィルター
- **UI Widget** — ツール出力に React コンポーネントを付加し、豊かでインタラクティブなレスポンスを実現
- **Zod バリデーション** — Schema からランタイムまでのエンドツーエンドな型安全性
- **NitroStudio** — サーバーのテスト、デバッグ、チャットに特化したデスクトップアプリ

## 実際の動作

```typescript
import { McpApp, Module, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';

@McpApp({
  module: AppModule,
  server: { name: 'my-server', version: '1.0.0' }
})
@Module({ imports: [] })
export class AppModule {}

export class SearchTools {
  @Tool({
    name: 'search_products',
    description: 'Search the product catalog',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      maxResults: z.number().default(10)
    })
  })
  @UseGuards(ApiKeyGuard)
  @Cache({ ttl: 300 })
  @Widget('product-grid')
  async search(input: { query: string; maxResults: number }, ctx: ExecutionContext) {
    ctx.logger.info('Searching products', { query: input.query });
    return this.productService.search(input.query, input.maxResults);
  }
}
```

一つのデコレータースタックで、**API 定義 + バリデーション + 認証 + キャッシュ + UI** を実現します。定型コードは不要です。

## エコシステム

NitroStack はモジュール式です。必要なものだけをインストールしてください。
NitroStack パッケージの実装ワークスペースは [`typescript/`](./typescript) にあります。

| パッケージ | 機能 | インストール |
|:---|:---|:---|
| [`@nitrostack/core`](./typescript/packages/core) | フレームワーク：デコレーター、DI、サーバーランタイム | `npm i @nitrostack/core` |
| [`@nitrostack/cli`](./typescript/packages/cli) | スキャフォールディング、開発サーバー、コードジェネレーター | `npm i -g @nitrostack/cli` |
| [`@nitrostack/widgets`](./typescript/packages/widgets) | インタラクティブなツール出力 UI のための React SDK | `npm i @nitrostack/widgets` |

## NitroStudio

NitroStudio は MCP サーバー開発専用のデスクトップアプリです。プロジェクトフォルダーを開けば、開発サーバーを自動で処理します。

![NitroStudio](assets/gif/nitrostudio-main.gif)

**[NitroStudio をダウンロード](https://nitrostack.ai/studio)**

<table>
<tr>
<td width="50%">

**リアルタイムのツールテスト**
ツールを実行し、ペイロードを確認し、リクエスト/レスポンスのサイクルをデバッグします。

![テスト](assets/gif/nitrostudio-testing.gif)

</td>
<td width="50%">

**組み込み AI チャット**
統合 AI アシスタントを通じて MCP サーバーと会話します。

![AI チャット](assets/gif/nitrostudio-chat.gif)

</td>
</tr>
</table>

- **Widget プレビュー** — インタラクティブな UI コンポーネントを即座に表示
- **ホットリロード** — 開発中の変更をリアルタイムに反映

## ドキュメント

| リソース | 説明 |
|:---|:---|
| [はじめに](https://docs.nitrostack.ai/getting-started) | インストール、クイックスタート、最初のプロジェクト |
| [サーバーの概念](https://docs.nitrostack.ai/sdk/typescript/server-concepts) | モジュール、DI、アーキテクチャの詳細 |
| [ツールガイド](https://docs.nitrostack.ai/sdk/typescript/tools-guide) | ツール、バリデーション、アノテーションの定義 |
| [Widget ガイド](https://docs.nitrostack.ai/sdk/typescript/ui-widgets-guide) | インタラクティブな UI コンポーネントの構築 |
| [認証](https://docs.nitrostack.ai/sdk/typescript/authentication-overview) | JWT、OAuth 2.1、API キーの設定 |
| [CLI リファレンス](https://docs.nitrostack.ai/cli/introduction) | すべての CLI コマンドとオプション |
| [デプロイ](https://docs.nitrostack.ai/deployment/checklist) | 本番環境チェックリスト、Docker、クラウドプラットフォーム |

## コミュニティ

- [Discord](https://discord.gg/uVWey6UhuD) — 質問、プロジェクトの共有、サポート
- [GitHub Discussions](https://github.com/nitrocloudofficial/nitrostack/discussions) — 提案、アイデア、Q&A
- [Twitter / X](https://x.com/nitrostackai) — お知らせと更新情報
- [YouTube](https://www.youtube.com/@nitrostackai) — 製品デモとチュートリアル
- [LinkedIn](https://linkedin.com/company/nitrostack-ai/) — 企業ニュースと更新情報
- [GitHub](https://github.com/nitrostackai) — Organization プロフィールとオープンソース活動
- [ブログ](https://blog.nitrostack.ai) — チュートリアル、詳細解説、リリースノート

## コントリビューション

バグ修正、機能、ドキュメント、アイデアなど、あらゆるコントリビューションを歓迎します。まず **[コントリビューションガイド](./CONTRIBUTING.md)** をお読みください。

どこから始めるか迷っていますか？[**good first issue**](https://github.com/nitrocloudofficial/nitrostack/labels/good%20first%20issue) ラベルの付いた Issue を確認してください。

## コントリビューター

<a href="https://github.com/nitrocloudofficial/nitrostack/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nitrocloudofficial/nitrostack" alt="コントリビューター" />
</a>

## ライセンス

NitroStack は [Apache License 2.0](./LICENSE) の下で提供されるオープンソースソフトウェアです。

---

<div align="center">
  <sub><a href="https://nitrostack.ai">NitroStack</a> チームとコントリビューターによって構築されています。</sub>
</div>
