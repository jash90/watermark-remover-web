import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiKeyNotConfiguredException extends HttpException {
  constructor() {
    super(
      'Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class ImageProcessingException extends HttpException {
  constructor(message: string) {
    super(`Image processing failed: ${message}`, HttpStatus.BAD_REQUEST);
  }
}

export class GeminiApiException extends HttpException {
  constructor(message: string, statusCode: number = HttpStatus.BAD_GATEWAY) {
    super(`Gemini API error: ${message}`, statusCode);
  }
}

export class InvalidImageFormatException extends HttpException {
  constructor(format: string) {
    super(
      `Invalid image format: ${format}. Supported formats: PNG, JPEG, WebP, GIF`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FileTooLargeException extends HttpException {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSize}MB`,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

export class ContentPolicyException extends HttpException {
  constructor(
    message: string = 'The AI model declined this request due to content policy restrictions',
  ) {
    super(message, HttpStatus.FORBIDDEN);
  }
}
