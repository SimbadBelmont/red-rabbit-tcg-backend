FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# server.js escucha en process.env.PORT o 5000
EXPOSE 5000
USER node
CMD ["node", "server.js"]
