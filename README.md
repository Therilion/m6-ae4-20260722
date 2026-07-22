# m6-ae4-20260722

Aplicación de ejemplo en **Node.js + TypeScript + Express**, empaquetada en una imagen **Docker** ligera. Expone una API mínima pensada como base para desplegar en AWS.

## Stack

| Componente | Versión |
| --- | --- |
| Node.js | 24 LTS |
| TypeScript | 7 |
| Express | 5 |
| Gestor de paquetes | pnpm (vía Corepack) |
| Imagen base | `node:24-alpine` |

## Endpoints

| Método | Ruta | Respuesta |
| --- | --- | --- |
| `GET` | `/` | `200` — `{ "message": "¡Hola mundo!" }` |
| `GET` | `/health` | `200` — `{ "status": "ok", "uptime": ..., "timestamp": ... }` |
| — | cualquier otra | `404` — `{ "error": "Not Found" }` |

## Requisitos

- Node.js 24 o superior
- Corepack habilitado (viene con Node): `corepack enable`
- Docker (opcional, para la ejecución en contenedor)

## Ejecución en local

```bash
pnpm install

# Desarrollo: ejecuta el TypeScript directamente y recarga al guardar
pnpm dev

# Producción: compila a dist/ y arranca
pnpm build
pnpm start
```

La aplicación queda en http://localhost:3000

```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

## Ejecución con Docker

```bash
docker build -t ejercicio-aws .
docker run --rm -p 3000:3000 ejercicio-aws
```

Para ver el estado del `HEALTHCHECK` integrado:

```bash
docker ps   # la columna STATUS mostrará "healthy"
```

## Variables de entorno

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto de escucha |
| `HOST` | `0.0.0.0` | Interfaz de escucha (`0.0.0.0` para ser alcanzable desde fuera del contenedor) |
| `NODE_ENV` | `production` en la imagen | Entorno de ejecución |

## Estructura

```
src/
  app.ts      # Construye la app Express (rutas, 404, manejo de errores)
  server.ts   # Arranque del servidor y apagado ordenado (SIGTERM/SIGINT)
Dockerfile    # Build multi-etapa: deps → build → prod-deps → runtime
```

## Notas sobre el Dockerfile

- **Multi-etapa**: la imagen final solo contiene `dist/` y las dependencias de producción; ni código fuente ni devDependencies.
- **Sin root**: el proceso corre como el usuario `node`.
- **Corepack habilitado** en la imagen, con la versión de pnpm fijada en el campo `packageManager` del `package.json`.
- **`CMD` en exec form**: Node es el PID 1 y recibe `SIGTERM` directamente, lo que permite el apagado ordenado (`docker stop` cierra en menos de un segundo sin cortar peticiones en curso).
- **Capas ordenadas** de menos a más volátil y caché de pnpm con BuildKit para acelerar las reconstrucciones.
