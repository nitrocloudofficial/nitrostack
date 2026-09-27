[English](README.md) | **简体中文** | [日本語](README.ja.md)

<div align="center">
  <a href="https://nitrostack.ai">
    <img src="logo.png" alt="NitroStack" width="120" />
  </a>

  <h1>NitroStack</h1>

  <p><strong>用于构建生产就绪型 MCP 服务器的企业级 TypeScript 框架。</strong></p>
  <p>装饰器、依赖注入、Widget。一个框架即可交付 AI 原生后端。</p>

  <br />

  <a href="https://www.npmjs.com/package/@nitrostack/core"><img src="https://img.shields.io/npm/v/@nitrostack/core?style=flat-square&label=%40nitrostack%2Fcore&color=cb0000" alt="npm 版本" /></a>
  <a href="https://www.npmjs.com/package/@nitrostack/core"><img src="https://img.shields.io/npm/dm/@nitrostack/core?style=flat-square&color=cb0000" alt="npm 下载量" /></a>
  <a href="https://github.com/nitrocloudofficial/nitrostack"><img src="https://img.shields.io/github/stars/nitrocloudofficial/nitrostack?style=flat-square&color=cb0000" alt="GitHub 星标" /></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square" alt="许可证" /></a>
  <a href="https://discord.gg/uVWey6UhuD"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=flat-square&logo=discord&logoColor=white" alt="加入 Discord 社区" /></a>
  <a href="https://x.com/nitrostackai"><img src="https://img.shields.io/badge/Follow-000000?style=flat-square&logo=x&logoColor=white" alt="关注 X" /></a>
  <a href="https://www.youtube.com/@nitrostackai"><img src="https://img.shields.io/badge/YouTube-Subscribe-FF0000?style=flat-square&logo=youtube&logoColor=white" alt="订阅 YouTube" /></a>
  <a href="https://linkedin.com/company/nitrostack-ai/"><img src="https://img.shields.io/badge/LinkedIn-Follow-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="关注 LinkedIn" /></a>
  <a href="https://github.com/nitrostackai"><img src="https://img.shields.io/badge/GitHub-Organization-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub 组织" /></a>

  <br />
  <br />

  <a href="https://docs.nitrostack.ai"><strong>文档</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://docs.nitrostack.ai/quick-start"><strong>快速开始</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://blog.nitrostack.ai"><strong>博客</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://nitrostack.ai/studio"><strong>NitroStudio</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://discord.gg/uVWey6UhuD"><strong>Discord</strong></a>

  <br />
  <br />
</div>

---

## 快速开始

### 前置要求

- **Node.js** >= 20.18（[下载](https://nodejs.org/)）
- **npm** >= 9

### 1. 搭建新项目

```bash
npx @nitrostack/cli init my-server
```

![NitroStack CLI](assets/gif/nitrocli.gif)

### 2. 开始开发

```bash
cd my-server
npm install
npm run dev
```

你的 MCP 服务器已经运行。将它连接到任意兼容 MCP 的客户端即可。

### 3. 在 NitroStudio 中打开

项目搭建完成后，在 NitroStudio 中打开同一文件夹，即可进行可视化测试和调试。

- 下载：<https://nitrostack.ai/studio>
- 打开你的 `my-server` 项目文件夹
- 使用 NitroStudio 测试工具、检查载荷，并与你的 MCP 服务器聊天

## 为什么选择 NitroStack？

如今构建 MCP 服务器往往意味着拼接样板代码、重新实现身份验证，并期待工具链能够顺利扩展。NitroStack 提供一套有明确主张、功能完备的框架，让你可以专注于服务器真正要完成的工作。

- **装饰器驱动** — 使用简洁的声明式 TypeScript 装饰器定义工具、资源和提示词
- **依赖注入** — 一流的 DI 容器，支持单例、瞬时和作用域生命周期
- **内置身份验证** — 开箱即用的 JWT、OAuth 2.1 和 API 密钥身份验证
- **中间件管道** — 像企业级后端一样使用 Guard、Interceptor、Pipe 和异常过滤器
- **UI Widget** — 将 React 组件附加到工具输出，提供丰富的交互式响应
- **Zod 验证** — 从 Schema 到运行时的端到端类型安全
- **NitroStudio** — 专用于测试、调试服务器并与其聊天的桌面应用

## 查看实际效果

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

一组装饰器即可带来：**API 定义 + 验证 + 身份验证 + 缓存 + UI**，没有样板代码。

## 生态系统

NitroStack 采用模块化设计，只需安装你需要的部分：
NitroStack 软件包的实现工作区位于 [`typescript/`](./typescript)。

| 软件包 | 功能 | 安装 |
|:---|:---|:---|
| [`@nitrostack/core`](./typescript/packages/core) | 框架：装饰器、DI、服务器运行时 | `npm i @nitrostack/core` |
| [`@nitrostack/cli`](./typescript/packages/cli) | 项目搭建、开发服务器、代码生成器 | `npm i -g @nitrostack/cli` |
| [`@nitrostack/widgets`](./typescript/packages/widgets) | 用于交互式工具输出 UI 的 React SDK | `npm i @nitrostack/widgets` |

## NitroStudio

NitroStudio 是专为开发 MCP 服务器打造的桌面应用。打开项目文件夹后，它会替你处理开发服务器。

![NitroStudio](assets/gif/nitrostudio-main.gif)

**[下载 NitroStudio](https://nitrostack.ai/studio)**

<table>
<tr>
<td width="50%">

**实时工具测试**
执行工具、检查载荷并调试请求/响应周期。

![测试](assets/gif/nitrostudio-testing.gif)

</td>
<td width="50%">

**内置 AI 聊天**
通过集成的 AI 助手与你的 MCP 服务器对话。

![AI 聊天](assets/gif/nitrostudio-chat.gif)

</td>
</tr>
</table>

- **Widget 预览** — 即时查看交互式 UI 组件
- **热重载** — 开发过程中实时反映变更

## 文档

| 资源 | 说明 |
|:---|:---|
| [入门指南](https://docs.nitrostack.ai/getting-started) | 安装、快速开始和第一个项目 |
| [服务器概念](https://docs.nitrostack.ai/sdk/typescript/server-concepts) | 深入了解模块、DI 和架构 |
| [工具指南](https://docs.nitrostack.ai/sdk/typescript/tools-guide) | 定义工具、验证和注解 |
| [Widget 指南](https://docs.nitrostack.ai/sdk/typescript/ui-widgets-guide) | 构建交互式 UI 组件 |
| [身份验证](https://docs.nitrostack.ai/sdk/typescript/authentication-overview) | JWT、OAuth 2.1、API 密钥设置 |
| [CLI 参考](https://docs.nitrostack.ai/cli/introduction) | 所有 CLI 命令和选项 |
| [部署](https://docs.nitrostack.ai/deployment/checklist) | 生产环境检查清单、Docker、云平台 |

## 社区

- [Discord](https://discord.gg/uVWey6UhuD) — 提问、分享项目、获取帮助
- [GitHub Discussions](https://github.com/nitrocloudofficial/nitrostack/discussions) — 提案、想法和问答
- [Twitter / X](https://x.com/nitrostackai) — 公告和动态
- [YouTube](https://www.youtube.com/@nitrostackai) — 产品演示和操作讲解
- [LinkedIn](https://linkedin.com/company/nitrostack-ai/) — 公司新闻和动态
- [GitHub](https://github.com/nitrostackai) — 组织资料和开源工作
- [博客](https://blog.nitrostack.ai) — 教程、深入解析和发布说明

## 参与贡献

我们欢迎各种贡献，包括缺陷修复、功能、文档和想法。请先阅读 **[贡献指南](./CONTRIBUTING.md)**。

想找一个起点？请查看带有 [**good first issue**](https://github.com/nitrocloudofficial/nitrostack/labels/good%20first%20issue) 标签的 Issue。

## 贡献者

<a href="https://github.com/nitrocloudofficial/nitrostack/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nitrocloudofficial/nitrostack" alt="贡献者" />
</a>

## 许可证

NitroStack 是依据 [Apache License 2.0](./LICENSE) 许可的开源软件。

---

<div align="center">
  <sub>由 <a href="https://nitrostack.ai">NitroStack</a> 团队和贡献者共同构建。</sub>
</div>
