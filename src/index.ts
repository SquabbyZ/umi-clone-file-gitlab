import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { IApi } from 'umi';
import dayjs from 'dayjs';
import { downloadFile, fetchAllFiles, parseGitlabApiInfo, testApiConnection } from './utils';
import { IOptions } from 'types';
import { nameKey } from './consts';

export default (api: IApi) => {
  api.describe({
    key: nameKey,
    config: {
      default: {},
      schema(joi) {
        return joi.object({
          url: joi.string().required(),
          outputPath: joi.string().required(),
          gitLabToken: joi.string().required(),
        });
      },
    },
  });

  api.onStart(async () => {
    const opts: IOptions = api.config[nameKey] || {};
    const token = opts.gitLabToken;
    // 只在主项目根目录生成和读取 lock 文件
    const lockFilePath = resolve(api.paths.cwd!, `.${nameKey}.lock`);

    if (!opts.url || !opts.outputPath) {
      api.logger.warn(`[${nameKey}] 缺少 url 或 outputPath，跳过拉取`);
      return;
    }

    if (!token) {
      api.logger.error(`[${nameKey}] 缺少 gitLabToken`);
      throw new Error(`[${nameKey}] 请设置 gitLabToken`);
    }

    // 检查主项目根目录下的 lock 文件
    let lastLock: any = null;
    try {
      if (existsSync(lockFilePath)) {
        const lockContent = readFileSync(lockFilePath, 'utf8');
        lastLock = JSON.parse(lockContent);
        const localTime = dayjs(lastLock.time).format('YYYY-MM-DD HH:mm:ss');
        api.logger.info(`[${nameKey}] 文件锁存在，上次拉取时间: ${localTime}，本次跳过拉取`);
        return;
      }
    } catch (e) {
      api.logger.warn(`[${nameKey}] 文件锁读取失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      api.logger.info(`[${nameKey}] 开始拉取远程文档...`);
      const { apiBase, projectId, ref, rootPath } = parseGitlabApiInfo({
        apiUrl: opts.url,
      });

      api.logger.info(`[${nameKey}] 项目ID: ${projectId}, 分支: ${ref}, 根目录: ${rootPath}`);

      // 先测试API连接
      await testApiConnection({
        apiBase,
        projectId,
        token,
        api,
      });

      // 获取文件列表
      api.logger.info(`[${nameKey}] 正在获取文件列表...`);
      const files = await fetchAllFiles({
        apiBase,
        projectId,
        ref,
        path: rootPath,
        token,
      });

      if (!files.length) {
        api.logger.warn(`[${nameKey}] 未找到任何 .md 或 .mdx 文件`);
        return;
      }

      api.logger.info(`[${nameKey}] 找到 ${files.length} 个文件，开始下载...`);

      let successCount = 0;
      let failCount = 0;
      const fileList: string[] = [];

      for (const [index, file] of files.entries()) {
        try {
          api.logger.info(`[${nameKey}] 下载中 (${index + 1}/${files.length}): ${file.path}`);

          const content = await downloadFile({
            apiBase,
            projectId,
            filePath: file.path,
            ref,
            token,
          });

          const relativePath = file.path.startsWith(rootPath)
            ? file.path.slice(rootPath.length).replace(/^\//, '')
            : file.path;

          const absPath = resolve(api.paths.cwd!, opts.outputPath, relativePath);

          mkdirSync(dirname(absPath), { recursive: true });
          writeFileSync(absPath, content, 'utf8');

          api.logger.info(`[${nameKey}] ✓ 已写入: ${relativePath}`);
          fileList.push(relativePath);
          successCount++;
        } catch (fileError: any) {
          api.logger.error(`[${nameKey}] × 下载失败 ${file.path}: ${fileError.message}`);
          failCount++;
        }
      }

      // 只在主项目根目录生成 lock 文件
      const lockData = {
        time: new Date().toISOString(),
        files: fileList,
        successCount,
        failCount,
      };
      writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2), 'utf8');
      api.logger.info(`[${nameKey}] 文件锁已更新: ${lockFilePath}`);

      api.logger.info(
        `[${nameKey}] ✅ 文档拉取完成！成功: ${successCount}, 失败: ${failCount}, 总计: ${files.length}`,
      );

      if (failCount) {
        throw new Error(`${failCount} 个文件下载失败`);
      }
    } catch (e: any) {
      api.logger.error(`[${nameKey}] 拉取失败: ${e.message}`);
      throw new Error(`[${nameKey}] 插件执行失败，终止构建`);
    }
  });
};
