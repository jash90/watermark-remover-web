# Watermark Remover Web

Web-based watermark remover powered by Google Gemini AI. Upload an image, select the watermark region, and let AI remove it seamlessly.

## Tech Stack

- **Frontend** — Svelte 5 + SvelteKit + TypeScript + Vite
- **Backend** — NestJS 11 + Sharp + Google Gemini API
- **Deployment** — Vercel (serverless)

## Features

- Drag & drop image upload (PNG, JPEG, WebP, GIF up to 20 MB)
- Interactive region selector for watermark area
- AI-powered watermark removal via Google Gemini
- Batch processing queue
- Lossless output option
- Download processed images
- Rate limiting (100 req/min per IP)

## Quick Start

### Prerequisites

- Node.js >= 18
- Google Gemini API key — [get one here](https://aistudio.google.com/apikey)

### Installation

```bash
npm run install:all
```

### Environment Variables

**Backend** (`backend/.env`):
```
PORT=3000
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:3000/api
```

### Development

```bash
npm run dev          # Start both frontend and backend
npm run dev:frontend # Frontend only (port 5173)
npm run dev:backend  # Backend only (port 3000)
```

### Build

```bash
npm run build
```

## Project Structure

```
├── frontend/                # Svelte 5 + SvelteKit
│   └── src/
│       ├── lib/
│       │   ├── components/  # UI components
│       │   ├── api/         # API client
│       │   ├── stores/      # Svelte stores
│       │   └── types/       # TypeScript types
│       └── routes/          # SvelteKit pages
├── backend/                 # NestJS API
│   └── src/
│       ├── watermark/       # Core watermark removal logic
│       │   ├── gemini.service.ts
│       │   ├── image-processor.service.ts
│       │   ├── watermark.service.ts
│       │   └── watermark.controller.ts
│       ├── health/          # Health check endpoint
│       └── common/          # DTOs, filters, interfaces
├── vercel.json              # Vercel deployment config
└── package.json             # Root monorepo scripts
```

## API Endpoints

All routes prefixed with `/api/watermark`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/remove` | Remove watermark from image |
| POST | `/info` | Get image dimensions |
| GET | `/download/:filename` | Download processed image |
| GET | `/preview/:filename` | Get preview thumbnail |
| DELETE | `/:filename` | Delete processed file |
| GET | `/test-connection` | Test Gemini API connectivity |
| POST | `/cleanup` | Manual temp file cleanup |

## How It Works

1. Upload an image and select the watermark region
2. The full image + region coordinates are sent to Google Gemini
3. Gemini returns the image with the watermark removed
4. The edited region is composited onto the original at matching dimensions
5. Download the result

## License

MIT
