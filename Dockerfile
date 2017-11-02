FROM node:alpine

RUN mkdir /snatchem
WORKDIR /snatchem

COPY package.json /snatchem
RUN npm install

COPY . /snatchem
CMD node app.js
