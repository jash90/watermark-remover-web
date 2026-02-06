const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const { AppModule } = require('../dist/app.module');

const server = express();
let app;

async function bootstrap() {
  if (!app) {
    const adapter = new ExpressAdapter(server);
    app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn'],
    });

    const corsOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'https://frontend-one-red-58.vercel.app',
    ];

    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Gemini-Api-Key'],
      credentials: true,
    });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    app.setGlobalPrefix('api');
    await app.init();
  }
  return server;
}

module.exports = async (req, res) => {
  const handler = await bootstrap();
  return handler(req, res);
};
