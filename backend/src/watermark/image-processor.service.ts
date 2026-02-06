import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  ImageInfo,
  WatermarkRegion,
} from '../common/interfaces/watermark.interface';
import {
  ImageProcessingException,
  InvalidImageFormatException,
} from '../common/exceptions/watermark.exceptions';

const SUPPORTED_FORMATS = ['png', 'jpeg', 'jpg', 'webp', 'gif'];
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const PROCESSED_DIR = path.join(process.cwd(), 'processed');

// Gemini API max dimension limit
const MAX_DIMENSION = 4096;

// Magic bytes for MIME type detection
const MIME_SIGNATURES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP)
};

export interface PreprocessResult {
  buffer: Buffer;
  mimeType: string;
  originalDimensions: { width: number; height: number };
  resized: boolean;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  async onModuleInit() {
    // Ensure directories exist
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(PROCESSED_DIR, { recursive: true });
  }

  async getImageInfo(buffer: Buffer): Promise<ImageInfo> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      };
    } catch (error) {
      throw new ImageProcessingException(
        `Failed to read image metadata: ${error}`,
      );
    }
  }

  validateFormat(mimeType: string): void {
    const format = mimeType.split('/')[1]?.toLowerCase();
    if (!format || !SUPPORTED_FORMATS.includes(format)) {
      throw new InvalidImageFormatException(mimeType);
    }
  }

  validateRegion(region: WatermarkRegion, imageInfo: ImageInfo): void {
    if (region.x < 0 || region.y < 0) {
      throw new ImageProcessingException(
        'Region coordinates cannot be negative',
      );
    }
    if (region.width < 5 || region.height < 5) {
      throw new ImageProcessingException('Region must be at least 5x5 pixels');
    }
    if (
      region.x + region.width > imageInfo.width ||
      region.y + region.height > imageInfo.height
    ) {
      throw new ImageProcessingException('Region exceeds image boundaries');
    }
  }

  async saveUploadedFile(
    buffer: Buffer,
    originalName: string,
  ): Promise<string> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(filepath, buffer);
    return filename;
  }

  async saveProcessedImage(
    buffer: Buffer,
    lossless: boolean,
    originalFormat: string,
  ): Promise<{ filename: string; size: number }> {
    const id = uuidv4();
    let outputBuffer: Buffer;
    let ext: string;

    if (lossless || originalFormat === 'png') {
      outputBuffer = await sharp(buffer)
        .png({ compressionLevel: 9 })
        .toBuffer();
      ext = '.png';
    } else {
      outputBuffer = await sharp(buffer)
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer();
      ext = '.jpg';
    }

    const filename = `${id}${ext}`;
    const filepath = path.join(PROCESSED_DIR, filename);
    await fs.writeFile(filepath, outputBuffer);

    return {
      filename,
      size: outputBuffer.length,
    };
  }

  async getProcessedFile(filename: string): Promise<Buffer> {
    const filepath = path.join(PROCESSED_DIR, filename);
    return fs.readFile(filepath);
  }

  async getUploadedFile(filename: string): Promise<Buffer> {
    const filepath = path.join(UPLOADS_DIR, filename);
    return fs.readFile(filepath);
  }

  async deleteFile(
    filename: string,
    isProcessed: boolean = false,
  ): Promise<void> {
    const dir = isProcessed ? PROCESSED_DIR : UPLOADS_DIR;
    const filepath = path.join(dir, filename);
    try {
      await fs.unlink(filepath);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filepath}: ${error}`);
    }
  }

  async cleanupOldFiles(maxAgeMs: number = 3600000): Promise<void> {
    const now = Date.now();

    for (const dir of [UPLOADS_DIR, PROCESSED_DIR]) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filepath = path.join(dir, file);
          const stat = await fs.stat(filepath);
          if (now - stat.mtimeMs > maxAgeMs) {
            await fs.unlink(filepath);
            this.logger.log(`Cleaned up old file: ${filepath}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Cleanup error in ${dir}: ${error}`);
      }
    }
  }

  async generatePreview(
    buffer: Buffer,
    maxWidth: number = 800,
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(maxWidth, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  /**
   * Detects MIME type from buffer using magic bytes
   */
  detectMimeType(buffer: Buffer, sharpFormat?: string): string {
    // Check magic bytes first
    for (const [mimeType, signature] of Object.entries(MIME_SIGNATURES)) {
      if (buffer.length >= signature.length) {
        const matches = signature.every((byte, i) => buffer[i] === byte);
        if (matches) {
          // Additional check for WebP (needs WEBP after RIFF)
          if (mimeType === 'image/webp') {
            const webpMarker = buffer.slice(8, 12).toString('ascii');
            if (webpMarker === 'WEBP') {
              return 'image/webp';
            }
            continue;
          }
          return mimeType;
        }
      }
    }

    // Fallback to sharp format detection
    if (sharpFormat) {
      const formatMap: Record<string, string> = {
        png: 'image/png',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      return formatMap[sharpFormat] || 'image/jpeg';
    }

    return 'image/jpeg';
  }

  /**
   * Resizes image to fit within max dimension while maintaining aspect ratio
   */
  async resizeToFit(buffer: Buffer, maxDimension: number): Promise<Buffer> {
    return sharp(buffer)
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  /**
   * Resizes image to exact dimensions (may change aspect ratio)
   */
  async resizeToExact(
    buffer: Buffer,
    width: number,
    height: number,
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(width, height, {
        fit: 'fill',
      })
      .toBuffer();
  }

  /**
   * Validates and preprocesses image before sending to Gemini API
   * - Validates dimensions (max 4096x4096 for Gemini)
   * - Detects actual MIME type from file contents
   * - Resizes if needed
   */
  async validateAndPreprocessImage(buffer: Buffer): Promise<PreprocessResult> {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new ImageProcessingException('Unable to read image dimensions');
    }

    const mimeType = this.detectMimeType(buffer, metadata.format);
    const originalDimensions = {
      width: metadata.width,
      height: metadata.height,
    };

    let processedBuffer = buffer;
    let resized = false;

    // Check if image exceeds max dimensions
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      this.logger.log(
        `Resizing image from ${metadata.width}x${metadata.height} to fit ${MAX_DIMENSION}px`,
      );
      processedBuffer = await this.resizeToFit(buffer, MAX_DIMENSION);
      resized = true;
    }

    // Normalize RGBA to RGB for JPEG compatibility if needed
    if (metadata.channels === 4 && mimeType === 'image/jpeg') {
      processedBuffer = await sharp(processedBuffer)
        .flatten({ background: '#ffffff' })
        .toBuffer();
    }

    return {
      buffer: processedBuffer,
      mimeType,
      originalDimensions,
      resized,
    };
  }

  /**
   * Gets total size of temp directories
   */
  async getTempDirectorySize(): Promise<{
    uploads: number;
    processed: number;
    total: number;
  }> {
    let uploadsSize = 0;
    let processedSize = 0;

    for (const [dir, setSize] of [
      [UPLOADS_DIR, (s: number) => (uploadsSize = s)],
      [PROCESSED_DIR, (s: number) => (processedSize = s)],
    ] as const) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const stat = await fs.stat(path.join(dir, file));
          setSize(stat.size);
        }
      } catch {
        // Directory might not exist yet
      }
    }

    return {
      uploads: uploadsSize,
      processed: processedSize,
      total: uploadsSize + processedSize,
    };
  }

  /**
   * Crops a region from the image with optional padding for context.
   * The padding provides surrounding context to help Gemini understand
   * what to fill the inpainted area with.
   */
  async cropRegion(
    buffer: Buffer,
    region: WatermarkRegion,
    padding: number = 20,
  ): Promise<{ buffer: Buffer; adjustedRegion: WatermarkRegion }> {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new ImageProcessingException(
        'Unable to read image dimensions for cropping',
      );
    }

    // Calculate padded region (clamped to image bounds)
    const x = Math.max(0, region.x - padding);
    const y = Math.max(0, region.y - padding);
    const width = Math.min(metadata.width - x, region.width + padding * 2);
    const height = Math.min(metadata.height - y, region.height + padding * 2);

    this.logger.log(
      `Cropping region: original (${region.x},${region.y},${region.width},${region.height}) -> padded (${x},${y},${width},${height})`,
    );

    const croppedBuffer = await sharp(buffer)
      .extract({ left: x, top: y, width, height })
      .toBuffer();

    return {
      buffer: croppedBuffer,
      adjustedRegion: { x, y, width, height },
    };
  }

  /**
   * Composites an edited region back onto the original image.
   * Used after Gemini processes a cropped region to place it back
   * in its original position.
   */
  async compositeRegion(
    originalBuffer: Buffer,
    editedRegionBuffer: Buffer,
    position: { x: number; y: number },
  ): Promise<Buffer> {
    this.logger.log(
      `Compositing edited region at position (${position.x}, ${position.y})`,
    );

    return sharp(originalBuffer)
      .composite([
        {
          input: editedRegionBuffer,
          left: position.x,
          top: position.y,
          blend: 'over',
        },
      ])
      .toBuffer();
  }
}
