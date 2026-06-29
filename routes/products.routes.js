import { Router } from 'express';

import {
    create_product,
    delete_product,
    get_product,
    get_products,
    update_product
} from '../controllers/products.controller.js';
import { authenticate_token } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', get_products);
router.get('/:id', get_product);
router.post('/create', authenticate_token, create_product);
router.put('/:id', authenticate_token, update_product);
router.delete('/:id', authenticate_token, delete_product);

export default router;
