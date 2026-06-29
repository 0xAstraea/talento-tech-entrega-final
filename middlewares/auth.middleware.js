import { HttpError } from './error.middleware.js';
import { AuthService } from '../services/auth.service.js';

function authenticate_token(request, response, next) {
    const auth_header = request.headers.authorization || '';
    const auth_parts = auth_header.split(' ');
    const [scheme, token] = auth_parts;

    if (auth_parts.length !== 2 || scheme !== 'Bearer' || !token) {
        return next(new HttpError('Bearer token required', 401));
    }

    try {
        const auth_service = new AuthService();
        request.user = auth_service.verify_token(token);
        return next();
    } catch (error) {
        return next(error);
    }
}

export { authenticate_token };
