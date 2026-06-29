import 'dotenv/config.js';

import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';

import auth_routes from './routes/auth.routes.js';
import products_routes from './routes/products.routes.js';
import { error_middleware } from './middlewares/error.middleware.js';
import { not_found_middleware } from './middlewares/not_found.middleware.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
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

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.info(`Server running on port ${port}`);
    });
}

export default app;
