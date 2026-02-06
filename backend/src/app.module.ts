import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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

    // Scheduled tasks (cleanup, etc.)
    ScheduleModule.forRoot(),

    // Feature modules
    WatermarkModule,
    HealthModule,
  ],
})
export class AppModule {}
