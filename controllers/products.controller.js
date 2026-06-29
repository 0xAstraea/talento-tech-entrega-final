import { ProductsService } from '../services/products.service.js';

async function get_products(request, response, next) {
    try {
        const products_service = new ProductsService();
        const products = await products_service.get_all_products();

        return response.status(200).json({
            products
        });
    } catch (error) {
        return next(error);
    }
}

async function get_product(request, response, next) {
    try {
        const products_service = new ProductsService();
        const product = await products_service.get_product_by_id(request.params.id);

        return response.status(200).json({
            product
        });
    } catch (error) {
        return next(error);
    }
}

async function create_product(request, response, next) {
    try {
        const products_service = new ProductsService();
        const product = await products_service.create_product(request.body);

        return response.status(201).json({
            product
        });
    } catch (error) {
        return next(error);
    }
}

async function update_product(request, response, next) {
    try {
        const products_service = new ProductsService();
        const product = await products_service.update_product(request.params.id, request.body);

        return response.status(200).json({
            product
        });
    } catch (error) {
        return next(error);
    }
}

async function delete_product(request, response, next) {
    try {
        const products_service = new ProductsService();
        const result = await products_service.delete_product(request.params.id);

        return response.status(200).json(result);
    } catch (error) {
        return next(error);
    }
}

export {
    create_product,
    delete_product,
    get_product,
    get_products,
    update_product
};
