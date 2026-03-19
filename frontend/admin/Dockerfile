FROM node:22-alpine

WORKDIR /workspace/frontend/admin

COPY ./frontend/admin/package*.json ./
RUN npm install

COPY ./frontend/admin ./
COPY ./shared ../../shared

EXPOSE 5175

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]
