# @peaks/umi-clone-file-gitlab

[中文](./README.zh.md) 🇨🇳 | [English](./README.md) 🇬🇧

A UmiJS plugin for cloning files from other GitLab repositories into your current project. Supports recursive fetching of Markdown files and flexible download strategies for compatibility with various GitLab API endpoints.

## Features

- Clone files from any GitLab repository into your UmiJS project
- Recursively fetch all Markdown files (`.md`, `.mdx`) from a specified path
- Multiple download strategies: raw, repository files, blobs
- API connection test utility
- TypeScript support

## Installation

```bash
pnpm add @peaks/umi-clone-file-gitlab --save-dev
# or
npm install @peaks/umi-clone-file-gitlab --save-dev
```

## Usage

Add the plugin to your UmiJS config:

```js
// .umirc.ts or config/config.ts
export default {
  plugins: [require.resolve("@peaks/umi-clone-file-gitlab")],
  PeaksCopy: {
    url: "https://gitlab.example.com/api/v4/projects/123/repository/tree?path=docs&ref=main",
    outputPath: "./docs",
    gitLabToken: "your-gitlab-token",
  },
};
```

## Configuration Options

| Option      | Type   | Description                        |
| ----------- | ------ | ---------------------------------- |
| url         | string | GitLab API URL for the target repo |
| outputPath  | string | Local output directory             |
| gitLabToken | string | GitLab private token               |

## API

### fetchAllFiles(options)

Recursively fetches all Markdown files from the specified GitLab repository path.

### downloadFile(options)

Downloads the content of a single file from GitLab, with fallback strategies for compatibility.

### parseGitlabApiInfo(options)

Parses the GitLab API URL to extract project info.

### testApiConnection(options)

Tests API connectivity and permissions for the configured repository.

## Development

```bash
pnpm run build
pnpm run lint
pnpm run test
```

## License

ISC

## Author

zhuhaifeng
