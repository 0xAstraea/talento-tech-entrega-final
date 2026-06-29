import 'dotenv/config.js';

import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';

import auth_routes from './routes/auth.routes.js';
import products_routes from './routes/products.routes.js';
import { error_middleware } from './middlewares/error.middleware.js';
import { not_found_middleware } from './middlewares/not_found.middleware.js';
import { request_logger_middleware } from './middlewares/request_logger.middleware.js';
import { LoggerService } from './services/logger.service.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(request_logger_middleware);
app.use(bodyParser.json());

app.get('/', (request, response) => {
    return response.status(200).json({
        message: 'Products API is running',
        status: 'OK'
    });
});

app.use('/auth', auth_routes);
app.use('/api/products', products_routes);

app.use(not_found_middleware);
app.use(error_middleware);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(port, () => {
        LoggerService.info('Server running', {
            port
        });
    });
}

export default app;
