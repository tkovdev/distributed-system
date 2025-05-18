FROM node:18 AS builder
LABEL authors="tkov"

#BUILD
WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

#DEPLOY

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3100

ENTRYPOINT ["npm", "start"]