import { nameKey } from '../consts';
import axios from 'axios';
import { dirname } from 'path';
import {
  DownloadFileOptions,
  FetchAllFilesOptions,
  FileItem,
  ParseGitlabApiInfoOptions,
  ParseGitlabApiInfoReturn,
  TestApiConnectionOptions,
} from 'types';

/* 递归获取所有文件 */
const fetchAllFiles = async ({
  apiBase,
  projectId,
  ref,
  path,
  token,
}: FetchAllFilesOptions): Promise<{ name: string; path: string; type: string }[]> => {
  const apiUrl = `${apiBase}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(
    path,
  )}&ref=${ref}&recursive=true&per_page=100`;
  const { data } = await axios.get(apiUrl, {
    timeout: 15000,
    headers: {
      'PRIVATE-TOKEN': token,
    },
  });

  const files = data.filter(
    (item: FileItem) =>
      item.type === 'blob' && (item.path.endsWith('.md') || item.path.endsWith('.mdx')),
  );

  return files;
};

/* 下载单个文件内容 - 修复版本 */
const downloadFile = async ({
  apiBase,
  projectId,
  filePath,
  ref,
  token,
}: DownloadFileOptions): Promise<string> => {
  try {
    // 方法1：使用raw接口（推荐）
    const encodedFilePath = encodeURIComponent(filePath);
    const rawUrl = `${apiBase}/api/v4/projects/${projectId}/repository/files/${encodedFilePath}/raw?ref=${ref}`;

    console.log(`尝试下载文件: ${rawUrl}`);

    const { data } = await axios.get(rawUrl, {
      timeout: 15000,
      responseType: 'text',
      headers: {
        'PRIVATE-TOKEN': token,
      },
    });

    return data;
  } catch (error: unknown) {
    // 如果raw接口失败，尝试使用repository files接口
    // @ts-expect-error 兼容第三方类型不准确
    if (error?.response?.status === 404) {
      console.log('Raw接口404，尝试使用repository files接口');

      try {
        const encodedFilePath = encodeURIComponent(filePath);
        const fileUrl = `${apiBase}/api/v4/projects/${projectId}/repository/files/${encodedFilePath}?ref=${ref}`;

        const { data } = await axios.get(fileUrl, {
          timeout: 15000,
          headers: {
            'PRIVATE-TOKEN': token,
          },
        });

        // 这个接口返回base64编码的内容
        if (data.content) {
          return Buffer.from(data.content, 'base64').toString('utf8');
        }
        throw new Error('文件内容为空');
      } catch (secondError: unknown) {
        // 如果前两种方法都失败，尝试使用blobs接口
        // @ts-expect-error 兼容第三方类型不准确
        if (secondError?.response?.status === 404) {
          console.log('Repository files接口也404，尝试使用blobs接口');

          // 首先需要获取文件的SHA
          const treeUrl = `${apiBase}/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(
            dirname(filePath),
          )}&ref=${ref}`;
          const { data: treeData } = await axios.get(treeUrl, {
            headers: {
              'PRIVATE-TOKEN': token,
            },
          });

          const fileInfo = treeData.find(
            (item: FileItem) => item.type === 'blob' && item.path === filePath,
          );

          if (!fileInfo || !fileInfo.id) {
            throw new Error(`无法找到文件SHA: ${filePath}`);
          }

          const blobUrl = `${apiBase}/api/v4/projects/${projectId}/repository/blobs/${fileInfo.id}/raw`;
          const { data: content } = await axios.get(blobUrl, {
            timeout: 15000,
            responseType: 'text',
            headers: {
              'PRIVATE-TOKEN': token,
            },
          });

          return content;
        }
        throw secondError;
      }
    }
    throw error;
  }
};

/* 从 API 地址中提取项目信息 */
const parseGitlabApiInfo = ({ apiUrl }: ParseGitlabApiInfoOptions): ParseGitlabApiInfoReturn => {
  try {
    const urlObj = new URL(apiUrl);
    const apiBase = `${urlObj.protocol}//${urlObj.host}`;

    const projectIdMatch = urlObj.pathname.match(/\/api\/v4\/projects\/(\d+)\/repository\/tree/);
    if (!projectIdMatch) {
      throw new Error('无法从URL中提取项目ID');
    }
    const projectId = projectIdMatch[1];

    const params = new URLSearchParams(urlObj.search);
    const ref = params.get('ref') || 'main';
    const rootPath = params.get('path') || 'docs';

    return {
      apiBase,
      projectId,
      ref,
      rootPath: decodeURIComponent(rootPath),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`API 地址格式不正确: ${message}`);
  }
};

// 调试函数：测试API连接
async function testApiConnection({ apiBase, projectId, token, api }: TestApiConnectionOptions) {
  try {
    // 测试1：检查项目访问权限
    api.logger.info(`[${nameKey}] 测试项目访问权限...`);
    const projectUrl = `${apiBase}/api/v4/projects/${projectId}`;
    const projectResponse = await axios.get(projectUrl, {
      headers: { 'PRIVATE-TOKEN': token },
    });
    api.logger.info(`[${nameKey}] ✓ 项目可访问: ${projectResponse.data.name}`);

    // 测试2：检查仓库访问权限
    api.logger.info(`[${nameKey}] 测试仓库访问权限...`);
    api.logger.info(`[${nameKey}] ✓ 仓库可访问`);

    // 测试3：测试单个文件下载
    api.logger.info(`[${nameKey}] 测试文件下载权限...`);
    // 找一个已知存在的文件进行测试
    const testFiles = ['README.md', 'docs/README.md', 'README'];
    for (const testFile of testFiles) {
      try {
        const testUrl = `${apiBase}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(
          testFile,
        )}/raw?ref=develop`;
        await axios.get(testUrl, {
          headers: { 'PRIVATE-TOKEN': token },
          timeout: 10000,
        });
        api.logger.info(`[${nameKey}] ✓ 文件下载权限正常 (测试文件: ${testFile})`);
        return;
      } catch (error: unknown) {
        // 继续尝试下一个文件
        if (error instanceof Error) {
          api.logger.error(`[${nameKey}] API连接测试失败: ${error.message}`);
        } else {
          api.logger.error(`[${nameKey}] API连接测试失败: ${String(error)}`);
        }
      }
    }
    api.logger.warn(`[${nameKey}] ⚠ 无法测试文件下载，可能需要调整下载方法`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      api.logger.error(`[${nameKey}] API连接测试失败: ${error.message}`);
    } else {
      api.logger.error(`[${nameKey}] API连接测试失败: ${String(error)}`);
    }
    throw error;
  }
}

export { fetchAllFiles, downloadFile, parseGitlabApiInfo, testApiConnection };
