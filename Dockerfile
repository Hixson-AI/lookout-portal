# Development stage - includes all deps for vite dev server
FROM node:22-alpine AS dev

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose port for Vite dev server
EXPOSE 3000

# Default command for dev
CMD ["pnpm", "dev"]

# Production stage - static build only
FROM node:22-alpine AS build

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Install serve as a production dependency
RUN pnpm add serve

# Copy source and build
COPY . .
RUN pnpm build

# Nginx stage
FROM nginx:alpine AS production

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy error page
COPY --from=build /app/public/error.html /usr/share/nginx/html/error.html

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
