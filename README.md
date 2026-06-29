# Proyecto Final Node.js + Express

API REST para administrar productos de catálogo con Express, JWT y Firestore.

## Instalación

```bash
npm install
npm run start
```

El servidor usa `PORT=3000` por defecto. Las variables necesarias están documentadas en `.env.example`.
`DATA_SERVICE_TIMEOUT_MS` controla cuánto espera la API a Firestore antes de devolver error `500`.

## Autenticación

`POST /auth/login`

```json
{
    "username": "admin",
    "password": "admin123"
}
```

Respuesta:

```json
{
    "token": "Bearer <jwt>"
}
```

## Productos

- `GET /api/products`: lista todos los productos.
- `GET /api/products/:id`: obtiene un producto por ID.
- `POST /api/products/create`: crea un producto. Requiere Bearer token.
- `PUT /api/products/:id`: actualiza un producto. Requiere Bearer token.
- `DELETE /api/products/:id`: elimina un producto. Requiere Bearer token.

Body de creación:

```json
{
    "name": "Notebook",
    "price": 1200,
    "stock": 10,
    "description": "Notebook para oficina",
    "category": "technology",
    "image_url": "https://example.com/notebook.jpg"
}
```

## Errores

La API devuelve errores JSON con estados `400`, `401`, `403`, `404` y `500` según corresponda.
