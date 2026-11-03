FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.html server.js ./
COPY js ./js
COPY css ./css
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
