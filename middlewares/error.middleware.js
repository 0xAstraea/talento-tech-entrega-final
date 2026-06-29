class HttpError extends Error {
    constructor(message, status_code = 500, details = null) {
        super(message);
        this.name = 'HttpError';
        this.status_code = status_code;
        this.details = details;
    }
}

function error_middleware(error, request, response, next) {
    const status_code = error.status_code || error.status || 500;
    const message = status_code >= 500
        ? 'Internal server error'
        : error.message;

    const response_data = {
        error: message
    };

    if (error.details) {
        response_data.details = error.details;
    }

    return response.status(status_code).json(response_data);
}

export { HttpError, error_middleware };
