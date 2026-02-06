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

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inline_data?: {
          mime_type: string;
          data: string;
        };
        // Alternative camelCase version (some API versions)
        inlineData?: {
          mimeType: string;
          data: string;
        };
        text?: string;
      }>;
    };
    finishReason?: 'STOP' | 'SAFETY' | 'RECITATION' | 'MAX_TOKENS' | 'OTHER';
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
  error?: {
    message: string;
    code: number;
  };
}
