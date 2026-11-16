import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import speakeasy from 'speakeasy';

const BASE32_SECRET_PATTERN = /^[A-Z2-7]+=*$/i;

export function getSpeakeasySecret(): string | undefined {
  const secret = process.env.SPEAKEASY_SECRET;
  return secret && BASE32_SECRET_PATTERN.test(secret) ? secret : undefined;
}

export function verifySpeakeasyCode(code: unknown, secret: string): boolean {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return false;
  }

  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
}

function getRequestCode(req: Request): string | undefined {
  const authorization = req.get('authorization');
  if (authorization !== undefined) {
    const bearerToken = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
    return bearerToken;
  }

  return req.get('x-2fa-code');
}

@Injectable()
export class TwoFactorMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET') {
      return next();
    }

    const secret = getSpeakeasySecret();
    if (!secret) {
      res.status(503).json({
        statusCode: 503,
        message: 'Two-factor authentication is not configured.',
      });
      return;
    }

    if (!verifySpeakeasyCode(getRequestCode(req), secret)) {
      res.status(401).json({
        statusCode: 401,
        message: 'A valid bearer token or x-2fa-code header is required.',
      });
      return;
    }

    next();
  }
}
