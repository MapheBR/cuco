FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server ./server
COPY public ./public
COPY scripts ./scripts

EXPOSE 3000
CMD ["npm", "start"]
