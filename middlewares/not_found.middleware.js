import { HttpError } from './error.middleware.js';

function not_found_middleware(request, response, next) {
    return next(new HttpError(`Route ${request.originalUrl} not found`, 404));
}

export { not_found_middleware };
