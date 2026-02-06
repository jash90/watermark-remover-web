import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { WatermarkController } from './watermark.controller';
import { WatermarkService } from './watermark.service';
import { GeminiService } from './gemini.service';
import { ImageProcessorService } from './image-processor.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
    }),
  ],
  controllers: [WatermarkController],
  providers: [WatermarkService, GeminiService, ImageProcessorService],
  exports: [WatermarkService],
})
export class WatermarkModule {}
