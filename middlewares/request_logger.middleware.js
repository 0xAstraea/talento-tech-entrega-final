import { LoggerService } from '../services/logger.service.js';

function request_logger_middleware(request, response, next) {
    const start_time = Date.now();

    response.on('finish', () => {
        const duration_ms = Date.now() - start_time;
        const log_context = {
            method: request.method,
            path: request.originalUrl,
            status_code: response.statusCode,
            duration_ms,
            ip: request.ip,
            user_agent: request.get('user-agent')
        };

        if (response.statusCode >= 500) {
            LoggerService.error('Request finished with server error', log_context);
            return;
        }

        if (response.statusCode >= 400) {
            LoggerService.warn('Request finished with client error', log_context);
            return;
        }

        LoggerService.info('Request finished', log_context);
    });

    return next();
}

export { request_logger_middleware };
