# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci

# Copiar código fuente y archivos de configuración
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Compilar la aplicación
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar el código compilado desde la etapa builder
COPY --from=builder /usr/src/app/dist ./dist

# Puerto expuesto por la aplicación NestJS
EXPOSE 1433


# Comando para iniciar la aplicación en producción
CMD ["node", "dist/main.js"]
