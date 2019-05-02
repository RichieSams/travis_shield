FROM node:8.16-alpine

WORKDIR /app

# .npm-deps https://github.com/Automattic/node-canvas/issues/866
RUN apk add --no-cache --virtual .build-deps git build-base g++ \
	&& apk add --no-cache --virtual .npm-deps python2 cairo-dev libjpeg-turbo-dev pango \
	&& apk add --no-cache msttcorefonts-installer ttf-ubuntu-font-family

RUN /usr/bin/update-ms-fonts && fc-cache -f

# Install dependencies
COPY package.json /app/
RUN npm install \
	&& apk del .build-deps

COPY *.js /app/
COPY views /app/views
COPY routes /app/routes
COPY bin /app/bin

CMD [ "node", "bin/www" ]
