import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      statusCode,
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      body = {
        statusCode,
        ...(typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : (exceptionResponse as Record<string, unknown>)),
      };
    } else if (exception instanceof Error) {
      // Stack traces and internal error details stay in server logs only.
      this.logger.error(
        `Unhandled ${exception.name} on ${request.method} ${request.url}`,
        exception.stack,
      );
    }

    response.status(statusCode).json({
      ...body,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
