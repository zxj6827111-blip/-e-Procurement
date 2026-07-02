import type { UploadedFileMetadata } from "../../api/http";

export type FileRecord = UploadedFileMetadata & {
  fileId: string;
  attachmentKind: string;
  objectType: string;
  objectId: string;
  uploadedBy: string;
  versionNo: number;
};
