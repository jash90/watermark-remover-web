import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiKeyNotConfiguredException,
  GeminiApiException,
  ContentPolicyException,
} from '../common/exceptions/watermark.exceptions';
import {
  GeminiResponse,
  WatermarkRegion,
} from '../common/interfaces/watermark.interface';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  // Patterns that indicate content policy refusal
  private readonly POLICY_REFUSAL_PATTERNS = [
    'cannot fulfill',
    'cannot complete',
    'unable to process',
    'violates',
    'policy',
    'copyright',
    'intellectual property',
    'watermark removal',
    'not able to help',
    'cannot help with',
    'decline',
    "can't assist",
  ];

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(overrideKey?: string): string {
    const apiKey =
      overrideKey || this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ApiKeyNotConfiguredException();
    }
    return apiKey;
  }

  /**
   * Removes watermarks/text/logos from an image at specified coordinates.
   * Sends the full image with coordinates in the prompt.
   */
  async removeWatermark(
    imageBuffer: Buffer,
    mimeType: string,
    region: WatermarkRegion,
    apiKeyOverride?: string,
  ): Promise<Buffer> {
    const apiKey = this.getApiKey(apiKeyOverride);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `Remove the watermark from this image at position x=${region.x}, y=${region.y} with width=${region.width} and height=${region.height}. Seamlessly fill the area with appropriate background content that matches the surrounding pixels. Return only the edited image without any text response.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.makeApiRequest(apiKey, requestBody, attempt);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry content policy errors - they won't change
        if (error instanceof ContentPolicyException) {
          throw error;
        }

        // Don't retry client errors (4xx)
        if (error instanceof GeminiApiException) {
          const statusMatch = error.message.match(/status (\d+)/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1], 10);
            if (status >= 400 && status < 500) {
              throw error;
            }
          }
        }

        // Retry on server errors or network issues
        if (attempt < this.MAX_RETRIES) {
          const delayMs = this.RETRY_DELAY_MS * attempt;
          this.logger.warn(
            `Attempt ${attempt} failed, retrying in ${delayMs}ms: ${lastError.message}`,
          );
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new GeminiApiException('All retry attempts failed');
  }

  private async makeApiRequest(
    apiKey: string,
    requestBody: object,
    attempt: number,
  ): Promise<Buffer> {
    try {
      const response = await fetch(`${this.apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Gemini API error (attempt ${attempt}): ${response.status} - ${errorText}`,
        );
        throw new GeminiApiException(
          `API returned status ${response.status}: ${errorText}`,
          response.status >= 500 ? 502 : 400,
        );
      }

      const data: GeminiResponse = await response.json();

      // Log full response structure for debugging
      this.logger.debug(
        `Gemini response structure: ${JSON.stringify({
          hasError: !!data.error,
          hasCandidates: !!data.candidates,
          candidatesCount: data.candidates?.length,
          firstCandidateKeys: data.candidates?.[0]
            ? Object.keys(data.candidates[0])
            : [],
          partsCount: data.candidates?.[0]?.content?.parts?.length,
          partsTypes: data.candidates?.[0]?.content?.parts?.map((p) =>
            Object.keys(p),
          ),
        })}`,
      );

      if (data.error) {
        throw new GeminiApiException(data.error.message);
      }

      // Check for blocked content or finish reason issues
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        this.logger.warn(`Gemini finish reason: ${candidate.finishReason}`);
        if (candidate.finishReason === 'SAFETY') {
          throw new ContentPolicyException(
            'The AI model blocked this request due to safety filters. Try selecting a different region or using a different image.',
          );
        }
        if (candidate.finishReason === 'RECITATION') {
          throw new GeminiApiException(
            'The model detected potential copyright issues. Try a different image.',
          );
        }
      }

      // Extract parts from response
      const parts = candidate?.content?.parts;
      if (!parts || parts.length === 0) {
        // Check if there's a promptFeedback indicating the issue
        if (data.promptFeedback?.blockReason) {
          this.logger.warn(
            `Prompt blocked: ${data.promptFeedback.blockReason}`,
          );
          throw new ContentPolicyException(
            `Request blocked: ${data.promptFeedback.blockReason}. Try a different image or region.`,
          );
        }
        throw new GeminiApiException(
          'No content in response. The API may be experiencing issues - please try again.',
        );
      }

      // Check for image data first (could be inline_data or inlineData depending on API version)
      const imagePart = parts.find(
        (part) => part.inline_data || part.inlineData,
      );
      const imageData = imagePart?.inline_data || imagePart?.inlineData;
      if (imageData?.data) {
        return Buffer.from(imageData.data, 'base64');
      }

      // No image - check if this is a text-only policy refusal
      const textPart = parts.find((part) => part.text);
      if (textPart?.text) {
        const responseText = textPart.text.toLowerCase();
        const isPolicyRefusal = this.POLICY_REFUSAL_PATTERNS.some((pattern) =>
          responseText.includes(pattern.toLowerCase()),
        );

        if (isPolicyRefusal) {
          this.logger.warn(`Content policy refusal detected: ${textPart.text}`);
          throw new ContentPolicyException(
            'The AI model declined to process this request. This may be due to content policy restrictions. Try selecting a different region or using a different image.',
          );
        }

        // Text response but not a clear policy refusal - might be an explanation or error
        this.logger.warn(`Unexpected text-only response: ${textPart.text}`);
        throw new GeminiApiException(
          `The model returned text instead of an image: "${textPart.text.substring(0, 100)}..."`,
        );
      }

      // No image and no text - log the actual response for debugging
      this.logger.error(
        `Unexpected response format. Parts: ${JSON.stringify(parts)}`,
      );
      throw new GeminiApiException(
        'Unexpected response format from API. Please try again.',
      );
    } catch (error) {
      if (
        error instanceof GeminiApiException ||
        error instanceof ContentPolicyException
      ) {
        throw error;
      }
      this.logger.error(
        `Gemini API request failed (attempt ${attempt}): ${error}`,
      );
      throw new GeminiApiException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async testConnection(apiKeyOverride?: string): Promise<boolean> {
    try {
      const apiKey = this.getApiKey(apiKeyOverride);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(apiKeyOverride?: string): Promise<string[]> {
    const apiKey = this.getApiKey(apiKeyOverride);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );

    if (!response.ok) {
      throw new GeminiApiException('Failed to fetch models');
    }

    const data = await response.json();
    return (
      data.models?.map((model: { name: string }) =>
        model.name.replace('models/', ''),
      ) || []
    );
  }
}
