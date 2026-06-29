# Products API Bruno Collection

Coleccion Bruno para probar la API del proyecto final.

## Uso

1. Inicia la API desde la raiz del proyecto:

```bash
npm run start
```

2. Abre esta carpeta como coleccion en Bruno:

```text
bruno/Products API
```

3. Ejecuta `01 Login success` y copia el valor `token`.

4. Crea estas variables en Bruno:

- `bearer_token`: token completo devuelto por login, incluyendo `Bearer`.
- `product_id`: ID de un producto existente o el ID creado por `06 Create product`.

## Casos incluidos

- Healthcheck.
- Login valido.
- Login invalido.
- Listado publico de productos.
- Consulta por ID.
- Creacion sin token, esperada con `401`.
- Creacion, actualizacion y eliminacion con token.
- Ruta inexistente, esperada con `404`.
