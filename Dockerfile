FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci

COPY src ./src
COPY public ./public

EXPOSE 3000

CMD ["npm", "run", "demo"]
