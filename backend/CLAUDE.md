# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS backend for watermark removal using Google Gemini API. The service accepts images with watermark region coordinates, sends them to Gemini for processing, and returns the edited image.

## Commands

```bash
# Development
npm run start:dev      # Start with hot reload (watch mode)
npm run start:debug    # Start with debugger attached

# Build & Production
npm run build          # Compile TypeScript to dist/
npm run start:prod     # Run compiled code

# Code Quality
npm run lint           # ESLint with auto-fix
npm run format         # Prettier formatting

# Testing
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run e2e tests
jest --testPathPattern="service.spec" # Run specific test file
```

## Architecture

### API Flow
1. `WatermarkController` receives image + region coordinates via multipart form
2. `WatermarkService` orchestrates: preprocessing → Gemini API → post-processing → save
3. `GeminiService` calls Gemini API with full image and coordinates in prompt
4. `ImageProcessorService` handles Sharp operations (resize, crop, composite)

### Processing Pipeline
- Full image is sent to Gemini with region coordinates in the prompt
- Gemini response is resized to match original dimensions (Gemini may return different size)
- Edited region is cropped from Gemini response and composited onto original
- Result saved to `processed/` directory with UUID filename

### Key Services
- **GeminiService** (`gemini.service.ts`): Gemini API integration with retries, content policy detection
- **ImageProcessorService** (`image-processor.service.ts`): Sharp-based image operations, MIME detection, temp file management
- **WatermarkService** (`watermark.service.ts`): Main orchestration, scheduled cleanup (hourly)

### Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key (or pass via `X-Gemini-Api-Key` header)
- `PORT` - Server port (default: 3000)
- `FRONTEND_URL` - CORS allowed origins (comma-separated)

### API Endpoints
All routes prefixed with `/api/watermark`:
- `POST /remove` - Process image (multipart: `image` file + `region` JSON + optional `lossless` boolean)
- `POST /info` - Get image dimensions
- `GET /download/:filename` - Download processed image
- `GET /preview/:filename` - Get preview thumbnail
- `DELETE /:filename` - Delete processed file
- `GET /test-connection` - Test Gemini API connectivity
- `POST /cleanup` - Manual temp file cleanup

### Constraints
- Max file size: 20MB
- Max image dimension: 4096px (auto-resized if larger)
- Supported formats: PNG, JPEG, WebP, GIF
- Minimum region size: 5x5 pixels
- Rate limit: 100 requests/minute per IP
