import { LoggerService } from '../services/logger.service.js';

class HttpError extends Error {
    constructor(message, status_code = 500, details = null, code = null) {
        super(message);
        this.name = 'HttpError';
        this.status_code = status_code;
        this.details = details;
        this.code = code || get_default_error_code(status_code);
    }
}

function error_middleware(error, request, response, next) {
    const status_code = error.status_code || error.status || 500;
    const is_controlled_error = error instanceof HttpError;
    const message = get_error_message(error, status_code, is_controlled_error);
    const details = get_error_details(error, is_controlled_error);

    log_error(error, request, status_code, message);

    const response_data = {
        success: false,
        error: {
            code: error.code || get_default_error_code(status_code),
            message
        }
    };

    if (details) {
        response_data.error.details = details;
    }

    return response.status(status_code).json(response_data);
}

function get_error_message(error, status_code, is_controlled_error) {
    if (error.type === 'entity.parse.failed') {
        return 'Invalid JSON body';
    }

    if (status_code >= 500 && !is_controlled_error) {
        return 'Something went wrong. Please try again later.';
    }

    return error.message || 'Unexpected error';
}

function get_error_details(error, is_controlled_error) {
    if (!error.details) {
        return null;
    }

    if (process.env.NODE_ENV === 'production' && !is_controlled_error) {
        return null;
    }

    return error.details;
}

function get_default_error_code(status_code) {
    const error_codes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        500: 'INTERNAL_SERVER_ERROR'
    };

    return error_codes[status_code] || 'REQUEST_ERROR';
}

function log_error(error, request, status_code, public_message) {
    const log_context = {
        method: request.method,
        path: request.originalUrl,
        status_code,
        public_message,
        error_message: error.message,
        error_code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    };

    if (status_code >= 500) {
        LoggerService.error('Request failed', log_context);
        return;
    }

    LoggerService.warn('Request rejected', log_context);
}

export { HttpError, error_middleware };
