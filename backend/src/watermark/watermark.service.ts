import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ImageProcessorService } from './image-processor.service';
import {
  ProcessResult,
  WatermarkRegion,
  ImageInfo,
} from '../common/interfaces/watermark.interface';
import { FileTooLargeException } from '../common/exceptions/watermark.exceptions';

const MAX_FILE_SIZE_MB = 20;
const CLEANUP_MAX_AGE_MS = 3600000; // 1 hour

@Injectable()
export class WatermarkService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WatermarkService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  async onApplicationBootstrap() {
    // Cleanup old files on startup
    this.logger.log('Running startup cleanup...');
    await this.imageProcessor.cleanupOldFiles(CLEANUP_MAX_AGE_MS);
    this.logger.log('Startup cleanup completed');
  }

  async handleScheduledCleanup() {
    this.logger.log('Running scheduled cleanup...');
    await this.imageProcessor.cleanupOldFiles(CLEANUP_MAX_AGE_MS);
    const sizes = await this.imageProcessor.getTempDirectorySize();
    this.logger.log(
      `Scheduled cleanup completed. Current temp size: ${(sizes.total / 1024 / 1024).toFixed(2)} MB`,
    );
  }

  async processImage(
    file: Express.Multer.File,
    region: WatermarkRegion,
    lossless: boolean = false,
    apiKey?: string,
  ): Promise<ProcessResult> {
    const startTime = Date.now();

    // Validate file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new FileTooLargeException(file.size, MAX_FILE_SIZE_MB);
    }

    // Validate format based on extension first
    this.imageProcessor.validateFormat(file.mimetype);

    // Preprocess image: validate dimensions, detect actual MIME type, resize if needed
    const preprocessResult =
      await this.imageProcessor.validateAndPreprocessImage(file.buffer);

    if (preprocessResult.resized) {
      this.logger.log(
        `Image was resized from ${preprocessResult.originalDimensions.width}x${preprocessResult.originalDimensions.height}`,
      );
    }

    // Get image info from preprocessed buffer and validate region
    const imageInfo = await this.imageProcessor.getImageInfo(
      preprocessResult.buffer,
    );

    // Adjust region if image was resized
    let adjustedRegion = region;
    if (preprocessResult.resized) {
      const scaleX =
        imageInfo.width / preprocessResult.originalDimensions.width;
      const scaleY =
        imageInfo.height / preprocessResult.originalDimensions.height;
      adjustedRegion = {
        x: Math.round(region.x * scaleX),
        y: Math.round(region.y * scaleY),
        width: Math.round(region.width * scaleX),
        height: Math.round(region.height * scaleY),
      };
      this.logger.log(
        `Region adjusted from (${region.x},${region.y},${region.width},${region.height}) to (${adjustedRegion.x},${adjustedRegion.y},${adjustedRegion.width},${adjustedRegion.height})`,
      );
    }

    this.imageProcessor.validateRegion(adjustedRegion, imageInfo);

    // Save original file
    const uploadedFilename = await this.imageProcessor.saveUploadedFile(
      file.buffer,
      file.originalname,
    );

    try {
      // Step 1: Send full image to Gemini with region coordinates in prompt
      this.logger.log(
        `Sending full image to Gemini with region: (${adjustedRegion.x}, ${adjustedRegion.y}, ${adjustedRegion.width}, ${adjustedRegion.height})`,
      );

      const geminiResponse = await this.geminiService.removeWatermark(
        preprocessResult.buffer,
        preprocessResult.mimeType,
        adjustedRegion,
        apiKey,
      );

      this.logger.log(`Gemini returned image: ${geminiResponse.length} bytes`);

      // Step 2: Resize Gemini response to match original dimensions (Gemini may return different size)
      const geminiInfo = await this.imageProcessor.getImageInfo(geminiResponse);
      this.logger.log(
        `Gemini image dimensions: ${geminiInfo.width}x${geminiInfo.height}, original: ${imageInfo.width}x${imageInfo.height}`,
      );

      let resizedGeminiResponse = geminiResponse;
      if (
        geminiInfo.width !== imageInfo.width ||
        geminiInfo.height !== imageInfo.height
      ) {
        this.logger.log(
          `Resizing Gemini response to match original dimensions`,
        );
        resizedGeminiResponse = await this.imageProcessor.resizeToExact(
          geminiResponse,
          imageInfo.width,
          imageInfo.height,
        );
      }

      // Step 3: Crop the edited region from resized Gemini response (no padding)
      const { buffer: editedRegionBuffer } =
        await this.imageProcessor.cropRegion(
          resizedGeminiResponse,
          adjustedRegion,
          0, // no padding - extract exact region
        );

      this.logger.log(
        `Extracted edited region: ${editedRegionBuffer.length} bytes`,
      );

      // Step 4: Composite edited region back onto original image
      const processedBuffer = await this.imageProcessor.compositeRegion(
        preprocessResult.buffer,
        editedRegionBuffer,
        { x: adjustedRegion.x, y: adjustedRegion.y },
      );

      this.logger.log(
        `Composited final image: ${processedBuffer.length} bytes`,
      );

      // Save processed image
      const { filename: processedFilename, size: processedSize } =
        await this.imageProcessor.saveProcessedImage(
          processedBuffer,
          lossless,
          imageInfo.format,
        );

      const processingTimeMs = Date.now() - startTime;

      return {
        id: processedFilename.replace(/\.[^.]+$/, ''),
        originalFilename: file.originalname,
        processedUrl: `/watermark/download/${processedFilename}`,
        previewUrl: `/watermark/preview/${processedFilename}`,
        originalSize: file.size,
        processedSize,
        processingTimeMs,
      };
    } catch (error) {
      // Cleanup uploaded file on error
      await this.imageProcessor.deleteFile(uploadedFilename);
      throw error;
    }
  }

  async getImageInfo(file: Express.Multer.File): Promise<ImageInfo> {
    this.imageProcessor.validateFormat(file.mimetype);
    return this.imageProcessor.getImageInfo(file.buffer);
  }

  async getProcessedFile(filename: string): Promise<Buffer> {
    return this.imageProcessor.getProcessedFile(filename);
  }

  async getPreview(filename: string): Promise<Buffer> {
    const buffer = await this.imageProcessor.getProcessedFile(filename);
    return this.imageProcessor.generatePreview(buffer);
  }

  async deleteProcessedFile(filename: string): Promise<void> {
    await this.imageProcessor.deleteFile(filename, true);
  }

  async testConnection(apiKey?: string): Promise<boolean> {
    return this.geminiService.testConnection(apiKey);
  }

  async listModels(apiKey?: string): Promise<string[]> {
    return this.geminiService.listModels(apiKey);
  }

  async cleanup(): Promise<void> {
    await this.imageProcessor.cleanupOldFiles();
  }
}
