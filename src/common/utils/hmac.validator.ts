import * as crypto from 'crypto';

export class HmacValidator {
  /**
   * Verifies an HMAC signature (SHA512 by default for Monnify webhooks)
   */
  static verifySignature(
    rawBody: Buffer | string,
    secretKey: string,
    providedSignature: string,
    algorithm = 'sha512',
  ): boolean {
    if (!rawBody || !secretKey || !providedSignature) {
      return false;
    }

    const computedSignature = crypto
      .createHmac(algorithm, secretKey)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe equal to prevent timing attacks
    const computedBuffer = Buffer.from(computedSignature, 'utf-8');
    const providedBuffer = Buffer.from(providedSignature, 'utf-8');

    if (computedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, providedBuffer);
  }
}
