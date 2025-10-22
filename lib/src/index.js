"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const dayjs_1 = __importDefault(require("dayjs"));
const utils_1 = require("./utils");
const consts_1 = require("./consts");
exports.default = (api) => {
    api.describe({
        key: consts_1.nameKey,
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
        const opts = api.config[consts_1.nameKey] || {};
        const token = opts.gitLabToken;
        // 只在主项目根目录生成和读取 lock 文件
        const lockFilePath = (0, path_1.resolve)(api.paths.cwd, `.${consts_1.nameKey}.lock`);
        if (!opts.url || !opts.outputPath) {
            api.logger.warn(`[${consts_1.nameKey}] 缺少 url 或 outputPath，跳过拉取`);
            return;
        }
        if (!token) {
            api.logger.error(`[${consts_1.nameKey}] 缺少 gitLabToken`);
            throw new Error(`[${consts_1.nameKey}] 请设置 gitLabToken`);
        }
        // 检查主项目根目录下的 lock 文件
        let lastLock = null;
        try {
            if ((0, fs_1.existsSync)(lockFilePath)) {
                const lockContent = (0, fs_1.readFileSync)(lockFilePath, 'utf8');
                lastLock = JSON.parse(lockContent);
                const localTime = (0, dayjs_1.default)(lastLock.time).format('YYYY-MM-DD HH:mm:ss');
                api.logger.info(`[${consts_1.nameKey}] 文件锁存在，上次拉取时间: ${localTime}，本次跳过拉取`);
                return;
            }
        }
        catch (e) {
            api.logger.warn(`[${consts_1.nameKey}] 文件锁读取失败: ${e instanceof Error ? e.message : String(e)}`);
        }
        try {
            api.logger.info(`[${consts_1.nameKey}] 开始拉取远程文档...`);
            const { apiBase, projectId, ref, rootPath } = (0, utils_1.parseGitlabApiInfo)({
                apiUrl: opts.url,
            });
            api.logger.info(`[${consts_1.nameKey}] 项目ID: ${projectId}, 分支: ${ref}, 根目录: ${rootPath}`);
            // 先测试API连接
            await (0, utils_1.testApiConnection)({
                apiBase,
                projectId,
                token,
                api,
            });
            // 获取文件列表
            api.logger.info(`[${consts_1.nameKey}] 正在获取文件列表...`);
            const files = await (0, utils_1.fetchAllFiles)({
                apiBase,
                projectId,
                ref,
                path: rootPath,
                token,
            });
            if (!files.length) {
                api.logger.warn(`[${consts_1.nameKey}] 未找到任何 .md 或 .mdx 文件`);
                return;
            }
            api.logger.info(`[${consts_1.nameKey}] 找到 ${files.length} 个文件，开始下载...`);
            let successCount = 0;
            let failCount = 0;
            const fileList = [];
            for (const [index, file] of files.entries()) {
                try {
                    api.logger.info(`[${consts_1.nameKey}] 下载中 (${index + 1}/${files.length}): ${file.path}`);
                    const content = await (0, utils_1.downloadFile)({
                        apiBase,
                        projectId,
                        filePath: file.path,
                        ref,
                        token,
                    });
                    const relativePath = file.path.startsWith(rootPath)
                        ? file.path.slice(rootPath.length).replace(/^\//, '')
                        : file.path;
                    const absPath = (0, path_1.resolve)(api.paths.cwd, opts.outputPath, relativePath);
                    (0, fs_1.mkdirSync)((0, path_1.dirname)(absPath), { recursive: true });
                    (0, fs_1.writeFileSync)(absPath, content, 'utf8');
                    api.logger.info(`[${consts_1.nameKey}] ✓ 已写入: ${relativePath}`);
                    fileList.push(relativePath);
                    successCount++;
                }
                catch (fileError) {
                    api.logger.error(`[${consts_1.nameKey}] × 下载失败 ${file.path}: ${fileError.message}`);
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
            (0, fs_1.writeFileSync)(lockFilePath, JSON.stringify(lockData, null, 2), 'utf8');
            api.logger.info(`[${consts_1.nameKey}] 文件锁已更新: ${lockFilePath}`);
            api.logger.info(`[${consts_1.nameKey}] ✅ 文档拉取完成！成功: ${successCount}, 失败: ${failCount}, 总计: ${files.length}`);
            if (failCount) {
                throw new Error(`${failCount} 个文件下载失败`);
            }
        }
        catch (e) {
            api.logger.error(`[${consts_1.nameKey}] 拉取失败: ${e.message}`);
            throw new Error(`[${consts_1.nameKey}] 插件执行失败，终止构建`);
        }
    });
};
