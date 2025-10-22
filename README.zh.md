# @peaks/umi-clone-file-gitlab

[中文](./README.zh.md) 🇨🇳 | [English](./README.md) 🇬🇧

一个用于将其他 GitLab 仓库文件克隆到当前 UmiJS 项目的插件。支持递归获取 Markdown 文件，并兼容多种 GitLab API 下载方式。

## 功能特点

- 从任意 GitLab 仓库克隆文件到 UmiJS 项目
- 递归获取指定路径下所有 Markdown 文件（`.md`、`.mdx`）
- 多种下载策略：raw、repository files、blobs
- API 连接测试工具
- TypeScript 类型支持

## 安装方法

```shell
pnpm add @peaks/umi-clone-file-gitlab --save-dev
# 或
npm install @peaks/umi-clone-file-gitlab --save-dev
```

## 使用方法

在 UmiJS 配置文件中添加插件：

```js
// .umirc.ts 或 config/config.ts
export default {
  plugins: [require.resolve("@peaks/umi-clone-file-gitlab")],
  PeaksCopy: {
    url: "https://gitlab.example.com/api/v4/projects/123/repository/tree?path=docs&ref=main",
    outputPath: "./docs",
    gitLabToken: "your-gitlab-token",
  },
};
```

## 配置参数

| 参数        | 类型   | 说明                       |
| ----------- | ------ | -------------------------- |
| url         | string | 目标仓库的 GitLab API 地址 |
| outputPath  | string | 本地输出目录               |
| gitLabToken | string | GitLab 私有 Token          |

## 主要 API

### fetchAllFiles(options)

递归获取指定仓库路径下所有 Markdown 文件。

### downloadFile(options)

下载单个文件内容，自动兼容多种 GitLab API。

### parseGitlabApiInfo(options)

解析 GitLab API 地址，提取项目信息。

### testApiConnection(options)

测试 API 连接和仓库权限。

## 开发与调试

```bash
pnpm run build
pnpm run lint
pnpm run test
```

## 许可证

ISC

## 作者

zhuhaifeng
