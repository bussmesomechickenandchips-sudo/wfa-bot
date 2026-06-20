FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN node src/deploy-commands.js

CMD ["node", "src/index.js"]
