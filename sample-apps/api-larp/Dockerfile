FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY src/widgets/package.json ./src/widgets/package.json
RUN npm install --include=dev

COPY . .
RUN npm run check

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002

COPY package.json ./
COPY src/widgets/package.json ./src/widgets/package.json
RUN npm install --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3002
CMD ["npm", "run", "start:prod"]
