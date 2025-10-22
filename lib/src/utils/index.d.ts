import { DownloadFileOptions, FetchAllFilesOptions, ParseGitlabApiInfoOptions, ParseGitlabApiInfoReturn, TestApiConnectionOptions } from 'types';
declare const fetchAllFiles: ({ apiBase, projectId, ref, path, token, }: FetchAllFilesOptions) => Promise<{
    name: string;
    path: string;
    type: string;
}[]>;
declare const downloadFile: ({ apiBase, projectId, filePath, ref, token, }: DownloadFileOptions) => Promise<string>;
declare const parseGitlabApiInfo: ({ apiUrl }: ParseGitlabApiInfoOptions) => ParseGitlabApiInfoReturn;
declare function testApiConnection({ apiBase, projectId, token, api }: TestApiConnectionOptions): Promise<void>;
export { fetchAllFiles, downloadFile, parseGitlabApiInfo, testApiConnection };
