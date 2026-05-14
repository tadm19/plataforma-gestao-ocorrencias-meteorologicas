# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev \
  && npm cache clean --force \
  && apk del .build-deps

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN apk add --no-cache libstdc++

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY middleware ./middleware
COPY routes ./routes
COPY services ./services

EXPOSE 3000

USER node

CMD ["npm", "start"]
