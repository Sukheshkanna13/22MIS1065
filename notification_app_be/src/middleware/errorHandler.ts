import { Request, Response, NextFunction } from 'express';
import { Log } from 'logging_middleware';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const message = err instanceof Error ? err.message : String(err);
  Log('backend', 'fatal', 'middleware', `Unhandled error on ${req.method} ${req.path}: ${message}`).catch(() => {});

  res.status(500).json({
    error: 'Internal server error',
    message,
  });
}
