FROM node:current-alpine3.23
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Telegram link is injected at build time (see vite %VITE_*% placeholders)
ARG VITE_TG_URL=https://t.me/your_handle
ARG VITE_TG_HANDLE=@your_handle
RUN printf 'VITE_TG_URL=%s\nVITE_TG_HANDLE=%s\n' "$VITE_TG_URL" "$VITE_TG_HANDLE" > .env \
    && npm run build

# vite preview serves the built dist/; nginx/reverse-proxy is handled outside
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
