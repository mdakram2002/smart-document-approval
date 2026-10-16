FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p uploads

EXPOSE 5000

CMD ["npm", "run", "dev"]
