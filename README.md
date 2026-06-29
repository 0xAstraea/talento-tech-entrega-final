# Proyecto Final Node.js + Express

API REST para administrar productos de catalogo con Express, JWT y Firestore.

## Instalacion

```bash
npm install
npm run start
```

El servidor usa `PORT=3000` por defecto. Las variables necesarias estan documentadas en `.env.example`.
`DATA_SERVICE_TIMEOUT_MS` controla cuanto espera la API a Firestore antes de devolver error `500`.

## Autenticacion

`POST /auth/login`

```json
{
    "username": "admin@gmail.com",
    "password": "123456"
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

Body de creacion:

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

## Bruno

La coleccion Bruno esta en `bruno/Products API`.

Flujo recomendado:

1. Ejecutar `npm run start`.
2. Abrir `bruno/Products API` desde Bruno.
3. Ejecutar `01 Login success`.
4. Copiar el `token` devuelto en la variable `bearer_token`.
5. Usar el ID creado por `06 Create product` como variable `product_id`.

## Firestore

La app usa el SDK `firebase`, por lo que Firestore aplica sus reglas de seguridad.

Si `GET /api/products` devuelve `Data service unavailable` con detalle `permission-denied`, revisa que las reglas permitan leer/escribir la coleccion `products`.

Regla recomendada para la entrega:

```js
rules_version = '2';

service cloud.firestore {
    match /databases/{database}/documents {
        match /products/{product_id} {
            allow read, write: if true;
        }
    }
}
```

Para pruebas de entrega podes usar el ejemplo de `firestore.rules.example`. La seguridad de escritura en esta API queda manejada por JWT en Express.

## Errores

La API devuelve errores JSON con estados `400`, `401`, `403`, `404` y `500` segun corresponda.
