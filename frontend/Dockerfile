FROM node:24.18.0-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:24.18.0-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
