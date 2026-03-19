FROM node:22-alpine

WORKDIR /workspace/frontend/employer

COPY ./frontend/employer/package*.json ./
RUN npm install

COPY ./frontend/employer ./
COPY ./shared ../../shared

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
