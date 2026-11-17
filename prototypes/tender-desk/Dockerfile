FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 MERITX_FEED_PATH=/data/feed.json
WORKDIR /app
COPY api/server.cjs /app/api/server.cjs
COPY app.cjs package.json /app/
COPY index.html /app/index.html
COPY assets/ /app/assets/
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD node -e "require('node:http').get('http://127.0.0.1:8080/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "app.cjs"]
