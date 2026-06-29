import { AuthService } from '../services/auth.service.js';

function login(request, response, next) {
    try {
        const auth_service = new AuthService();
        const token = auth_service.login(request.body);

        return response.status(200).json({
            token
        });
    } catch (error) {
        return next(error);
    }
}

export { login };
