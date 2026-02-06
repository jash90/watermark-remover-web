import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WatermarkModule } from './watermark/watermark.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration from environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // NO ScheduleModule - not compatible with serverless (Vercel)
    // Cron jobs are handled by Vercel Cron instead

    // Feature modules
    WatermarkModule,
    HealthModule,
  ],
})
export class AppServerlessModule {}
