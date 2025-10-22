import { IApi } from 'umi';

export interface IOptions {
  url: string;
  outputPath: string;
  gitLabToken: string;
}

export type FetchAllFilesOptions = {
  apiBase: string;
  projectId: string | number;
  ref: string;
  path: string;
  token: string;
};

export type DownloadFileOptions = {
  apiBase: string;
  projectId: string;
  filePath: string;
  ref: string;
  token: string;
};

export type ParseGitlabApiInfoOptions = {
  apiUrl: string;
};

export type ParseGitlabApiInfoReturn = {
  apiBase: string;
  projectId: string;
  ref: string;
  rootPath: string;
};

export type TestApiConnectionOptions = {
  apiBase: string;
  projectId: string;
  token: string;
  api: IApi;
};

export type FileItem = {
  id: string;
  name: string;
  type: string;
  path: string;
  mode: string;
};
