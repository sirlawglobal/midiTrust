import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (!value || typeof value !== 'object') {
      return value;
    }
    return this.sanitizeObject(value);
  }

  private sanitizeObject(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        // Prevent MongoDB operator injection (e.g. $where, $gt, etc.)
        if (key.startsWith('$') || key.includes('.')) {
          continue;
        }
        sanitized[key] = typeof val === 'string' ? val.trim() : this.sanitizeObject(val);
      }
      return sanitized;
    }

    return obj;
  }
}
