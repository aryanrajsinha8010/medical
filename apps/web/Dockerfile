FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html design-tokens.json ./
RUN npm install
COPY public ./public
COPY src ./src
EXPOSE 5173
CMD ["npm", "run", "dev"]

