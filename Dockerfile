FROM node:18-alpine as overmind
WORKDIR /app
RUN apk add --update curl gzip
RUN curl https://github.com/DarthSim/overmind/releases/download/v2.4.0/overmind-v2.4.0-linux-amd64.gz -L -o overmind.gz
RUN gunzip overmind.gz
RUN chmod +x overmind

FROM node:18-alpine
ENV NODE_ENV=production
ENV DATA_PATH=/app/data
RUN apk --no-cache add ca-certificates tmux
EXPOSE 7171
WORKDIR /app
CMD ["overmind", "start"]
COPY Procfile .
COPY --from=overmind /app/overmind /bin/overmind

# server
COPY ./packages/server/dist/ .
COPY ./packages/server/public/ ./public
COPY ./packages/server/templates/ ./templates

# TODO: used to suppress warning remove after fixed
RUN mkdir -p /static

# app
ENV NUXT_PUBLIC_API_CLIENT_BASE_URL=/api
COPY ./packages/app/.output .output

RUN chown -R node:node /app