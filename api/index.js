const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const { AppServerlessModule } = require('../backend/dist/app-serverless.module');
const { GlobalExceptionFilter } = require('../backend/dist/common/filters/http-exception.filter');

const server = express();
let app;

async function bootstrap() {
  if (!app) {
    const adapter = new ExpressAdapter(server);
    app = await NestFactory.create(AppServerlessModule, adapter, {
      logger: ['error', 'warn'],
    });

    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Gemini-Api-Key'],
      credentials: true,
    });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api');
    await app.init();
  }
  return server;
}

module.exports = async (req, res) => {
  const handler = await bootstrap();
  return handler(req, res);
};
