export interface UploadedProjectFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedAt: string;
}

export const projectStorageService = {
  async upload(_projectId: string, _file: File): Promise<UploadedProjectFile> {
    throw new Error('File storage is not yet supported');
  },
  async delete(_path: string): Promise<void> {
    throw new Error('File storage is not yet supported');
  },
  async getFiles(_projectId: string): Promise<UploadedProjectFile[]> {
    return [];
  },
};
