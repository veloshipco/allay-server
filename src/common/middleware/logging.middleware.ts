import { Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

const logger = new Logger("HTTP");

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { method, originalUrl, ip } = req;
  const userAgent = req.get("User-Agent") || "";
  const startTime = Date.now();

  // Log the incoming request
  logger.log(
    `Incoming Request: ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`
  );

  // Override the res.end method to log the response
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    // Log the response
    logger.log(
      `Outgoing Response: ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms`
    );

    // Call the original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}
