FROM ghcr.io/lavalink-devs/lavalink:4-alpine
COPY --chown=lavalink:lavalink lavalink/application.yml /opt/Lavalink/application.yml
EXPOSE 2333
