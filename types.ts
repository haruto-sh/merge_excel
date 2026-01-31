
export interface ExcelFile {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  file: File;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  resultUrl: string | null;
}

export enum SheetNames {
  KOSEI = '構成',
  NAIYO = '内容',
  TEMPRE = 'テンプレ'
}
