FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

RUN npx prisma generate

COPY . .
RUN npm run build

RUN mkdir -p uploads

EXPOSE 5000

CMD ["npm", "run", "dev"]
