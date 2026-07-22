# syntax=docker/dockerfile:1

###############################################################################
# Base: Node 24 (LTS) sobre Alpine + Corepack habilitado para poder usar pnpm.
# La versión concreta de pnpm la resuelve Corepack desde el campo
# "packageManager" del package.json, así el build es reproducible.
###############################################################################
FROM node:24-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

###############################################################################
# Dependencias completas (incluidas las de desarrollo) para poder compilar.
# Se copian solo los manifiestos primero: mientras no cambien, Docker reutiliza
# esta capa aunque cambie el código fuente.
###############################################################################
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

###############################################################################
# Compilación de TypeScript a JavaScript en dist/.
###############################################################################
FROM deps AS build

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

###############################################################################
# Solo dependencias de producción, con node_modules plano (node-linker=hoisted)
# para que se copie limpiamente a la imagen final sin el árbol de symlinks
# de pnpm.
###############################################################################
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --config.node-linker=hoisted

###############################################################################
# Imagen final: solo runtime. Sin código fuente, sin devDependencies y
# ejecutando como usuario sin privilegios.
###############################################################################
FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Exec form: node es el PID 1 y recibe SIGTERM directamente, lo que permite
# el apagado ordenado implementado en src/server.ts.
CMD ["node", "dist/server.js"]
