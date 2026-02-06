import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Headers,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { WatermarkService } from './watermark.service';
import { RemoveWatermarkDto } from '../common/dto/remove-watermark.dto';
import {
  ProcessResult,
  ImageInfo,
} from '../common/interfaces/watermark.interface';

const API_KEY_HEADER = 'x-gemini-api-key';

@Controller('watermark')
export class WatermarkController {
  constructor(private readonly watermarkService: WatermarkService) {}

  @Post('remove')
  @UseInterceptors(FileInterceptor('image'))
  async removeWatermark(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|jpg|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: RemoveWatermarkDto,
    @Headers(API_KEY_HEADER) apiKey?: string,
  ): Promise<ProcessResult> {
    return this.watermarkService.processImage(
      file,
      dto.region,
      dto.lossless ?? false,
      apiKey,
    );
  }

  @Post('info')
  @UseInterceptors(FileInterceptor('image'))
  async getImageInfo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|jpg|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ImageInfo> {
    return this.watermarkService.getImageInfo(file);
  }

  @Get('download/:filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.watermarkService.getProcessedFile(filename);
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('preview/:filename')
  async getPreview(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.watermarkService.getPreview(filename);

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(buffer);
  }

  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('filename') filename: string): Promise<void> {
    await this.watermarkService.deleteProcessedFile(filename);
  }

  @Get('test-connection')
  async testConnection(
    @Headers(API_KEY_HEADER) apiKey?: string,
  ): Promise<{ connected: boolean }> {
    const connected = await this.watermarkService.testConnection(apiKey);
    return { connected };
  }

  @Get('models')
  async listModels(
    @Headers(API_KEY_HEADER) apiKey?: string,
  ): Promise<{ models: string[] }> {
    const models = await this.watermarkService.listModels(apiKey);
    return { models };
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cleanup(): Promise<void> {
    await this.watermarkService.cleanup();
  }
}
