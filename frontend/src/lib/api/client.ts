import type {
  WatermarkRegion,
  ProcessResult,
  ImageInfo,
  ApiError,
} from '$lib/types/watermark';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private apiKey: string | null = null;

  constructor() {
    // Load API key from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem('gemini_api_key');
    }
  }

  setApiKey(key: string | null) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.apiKey) {
      headers['X-Gemini-Api-Key'] = this.apiKey;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
        timestamp: new Date().toISOString(),
        path: '',
      }));
      const err = new Error(error.message) as Error & { statusCode: number };
      err.statusCode = error.statusCode;
      throw err;
    }
    return response.json();
  }

  async removeWatermark(
    file: File,
    region: WatermarkRegion,
    lossless: boolean = false
  ): Promise<ProcessResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('region[x]', String(Math.round(region.x)));
    formData.append('region[y]', String(Math.round(region.y)));
    formData.append('region[width]', String(Math.round(region.width)));
    formData.append('region[height]', String(Math.round(region.height)));
    formData.append('lossless', String(lossless));

    const response = await fetch(`${API_BASE}/watermark/remove`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });

    return this.handleResponse<ProcessResult>(response);
  }

  async getImageInfo(file: File): Promise<ImageInfo> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/watermark/info`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });

    return this.handleResponse<ImageInfo>(response);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/watermark/test-connection`, {
        headers: this.getHeaders(),
      });
      const data = await response.json();
      return data.connected;
    } catch {
      return false;
    }
  }

  async testConnectionWithKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/watermark/test-connection`, {
        headers: {
          'X-Gemini-Api-Key': key,
        },
      });
      const data = await response.json();
      return data.connected;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/watermark/models`, {
      headers: this.getHeaders(),
    });
    const data = await this.handleResponse<{ models: string[] }>(response);
    return data.models;
  }

  async deleteProcessedFile(filename: string): Promise<void> {
    await fetch(`${API_BASE}/watermark/${filename}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  getDownloadUrl(processedUrl: string): string {
    return `${API_BASE}${processedUrl.startsWith('/') ? '' : '/'}${processedUrl}`;
  }

  getPreviewUrl(previewUrl: string): string {
    return `${API_BASE}${previewUrl.startsWith('/') ? '' : '/'}${previewUrl}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
