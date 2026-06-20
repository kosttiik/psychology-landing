FROM node:current-alpine3.23
WORKDIR /app

# The build needs devDependencies (vite, tsc, sass) even when the host/panel
# exports NODE_ENV=production into the build environment.
ENV NODE_ENV=development

# package-lock.json is required by `npm ci`; the * keeps COPY from failing if
# the build context was uploaded without it, and the RUN falls back cleanly.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --include=dev; \
    else \
      echo "WARN: package-lock.json missing from build context, falling back to npm install" && \
      npm install --include=dev; \
    fi

COPY . .

# Telegram link and site origin are injected at build time (vite %VITE_*% placeholders)
ARG VITE_TG_URL=https://t.me/mariia_cbt
ARG VITE_TG_HANDLE=@mariia_cbt
ARG VITE_SITE_URL=https://maria.samoylovs.ru
RUN printf 'VITE_TG_URL=%s\nVITE_TG_HANDLE=%s\nVITE_SITE_URL=%s\n' "$VITE_TG_URL" "$VITE_TG_HANDLE" "$VITE_SITE_URL" > .env \
    && npm run build

# vite preview serves the built dist/; nginx/reverse-proxy is handled outside
EXPOSE 4173
ENV NODE_ENV=production
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
