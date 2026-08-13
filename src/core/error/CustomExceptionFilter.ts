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
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const req: Request = ctx.getRequest();
    const res: Response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseContent =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: (exception as Error)?.message || 'Internal Server Error' };

    const message =
      typeof responseContent === 'string'
        ? responseContent
        : (responseContent as { message?: string })?.message ||
          'Error occurred';

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unexpected Error: ${(exception as Error)?.stack || String(exception)}`,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      time: new Date().toString(),
    });
  }
}
