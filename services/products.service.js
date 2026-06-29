import { HttpError } from '../middlewares/error.middleware.js';
import { ProductModel } from '../models/product.model.js';

const REQUIRED_FIELDS = ['name', 'price', 'stock'];
const OPTIONAL_FIELDS = ['description', 'category', 'image_url'];
const PRODUCT_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
const DEFAULT_DATA_SERVICE_TIMEOUT_MS = 10000;

class ProductsService {
    async get_all_products() {
        return ProductsService._run_model_operation(async () => {
            return ProductModel.find_all();
        });
    }

    async get_product_by_id(product_id) {
        const product = await ProductsService._run_model_operation(async () => {
            return ProductModel.find_by_id(product_id);
        });

        if (!product) {
            throw new HttpError('Product not found', 404);
        }

        return product;
    }

    async create_product(product_data) {
        const now = new Date().toISOString();
        const product_payload = this._validate_product_data(product_data);

        return ProductsService._run_model_operation(async () => {
            return ProductModel.create({
                ...product_payload,
                created_at: now,
                updated_at: now
            });
        });
    }

    async update_product(product_id, product_data) {
        const now = new Date().toISOString();
        const product_payload = this._validate_product_data(product_data, true);

        const updated_product = await ProductsService._run_model_operation(async () => {
            return ProductModel.update(product_id, {
                ...product_payload,
                updated_at: now
            });
        });

        if (!updated_product) {
            throw new HttpError('Product not found', 404);
        }

        return updated_product;
    }

    async delete_product(product_id) {
        const was_deleted = await ProductsService._run_model_operation(async () => {
            return ProductModel.delete(product_id);
        });

        if (!was_deleted) {
            throw new HttpError('Product not found', 404);
        }

        return {
            id: product_id,
            deleted: true
        };
    }

    _validate_product_data(product_data, partial = false) {
        if (!ProductsService._is_plain_object(product_data)) {
            throw new HttpError('Product data is required', 400);
        }

        if (!partial) {
            this._validate_required_fields(product_data);
        }

        const product_payload = this._build_product_payload(product_data);

        if (partial && Object.keys(product_payload).length === 0) {
            throw new HttpError('At least one product field is required', 400);
        }

        return product_payload;
    }

    _validate_required_fields(product_data) {
        const missing_fields = REQUIRED_FIELDS.filter((field) => {
            return product_data[field] === undefined || product_data[field] === null;
        });

        if (missing_fields.length > 0) {
            throw new HttpError('Required product fields are missing', 400, missing_fields);
        }
    }

    _build_product_payload(product_data) {
        const product_payload = {};

        PRODUCT_FIELDS.forEach((field) => {
            if (product_data[field] !== undefined) {
                product_payload[field] = product_data[field];
            }
        });

        this._validate_name(product_payload.name);
        this._validate_price(product_payload.price);
        this._validate_stock(product_payload.stock);
        this._validate_optional_string(product_payload.description, 'description');
        this._validate_optional_string(product_payload.category, 'category');
        this._validate_optional_string(product_payload.image_url, 'image_url');

        return product_payload;
    }

    _validate_name(name) {
        if (name === undefined) {
            return;
        }

        if (typeof name !== 'string' || name.trim().length === 0) {
            throw new HttpError('Product name must be a non-empty string', 400);
        }
    }

    _validate_price(price) {
        if (price === undefined) {
            return;
        }

        if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
            throw new HttpError('Product price must be a number greater than or equal to 0', 400);
        }
    }

    _validate_stock(stock) {
        if (stock === undefined) {
            return;
        }

        if (!Number.isInteger(stock) || stock < 0) {
            throw new HttpError('Product stock must be an integer greater than or equal to 0', 400);
        }
    }

    _validate_optional_string(value, field_name) {
        if (value === undefined) {
            return;
        }

        if (typeof value !== 'string') {
            throw new HttpError(`Product ${field_name} must be a string`, 400);
        }
    }

    static async _run_model_operation(operation) {
        try {
            const timeout_ms = Number(process.env.DATA_SERVICE_TIMEOUT_MS) || DEFAULT_DATA_SERVICE_TIMEOUT_MS;

            return await ProductsService._with_timeout(operation(), timeout_ms);
        } catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }

            throw ProductsService._build_data_service_error(error);
        }
    }

    static _build_data_service_error(error) {
        const details = process.env.NODE_ENV === 'production'
            ? null
            : ProductsService._get_data_service_error_details(error);

        return new HttpError('Data service unavailable', 500, details);
    }

    static _get_data_service_error_details(error) {
        if (error?.code) {
            return `Firestore ${error.code}: ${error.message}`;
        }

        return error?.message || 'Unknown data service error';
    }

    static async _with_timeout(promise, timeout_ms) {
        let timeout_id = null;

        const timeout_promise = new Promise((resolve, reject) => {
            timeout_id = setTimeout(() => {
                reject(new HttpError('Data service unavailable', 500));
            }, timeout_ms);
        });

        return Promise.race([promise, timeout_promise]).finally(() => {
            clearTimeout(timeout_id);
        });
    }

    static _is_plain_object(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
}

export { ProductsService };
