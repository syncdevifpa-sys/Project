FROM node:24-alpine

WORKDIR /app

# Instala dependências de build necessárias para compilação nativa (bcrypt)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
