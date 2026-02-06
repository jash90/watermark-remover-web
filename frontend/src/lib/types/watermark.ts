export interface WatermarkRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RemovalOptions {
  lossless: boolean;
}

export interface ProcessResult {
  id: string;
  originalFilename: string;
  processedUrl: string;
  previewUrl: string;
  originalSize: number;
  processedSize: number;
  processingTimeMs: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface BatchFile {
  id: string;
  file: File;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: ProcessResult;
}

export interface BatchProgress {
  currentIndex: number;
  totalFiles: number;
  currentFilename: string;
}

export type AppStage =
  | 'upload'
  | 'select'
  | 'processing'
  | 'preview'
  | 'batch-select'
  | 'batch-processing'
  | 'batch-results';

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}
