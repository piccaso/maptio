FROM node:16.14.0

WORKDIR /app

COPY . /app/

RUN npm install

EXPOSE 4200
CMD /app/docker-cmd.sh
