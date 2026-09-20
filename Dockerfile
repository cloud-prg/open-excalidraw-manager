FROM node:18-alpine

WORKDIR /app

# No npm install needed — server.js uses only built-in modules (http, fs, path)

# Copy static files
COPY public/ /app/
COPY server.js /app/

# Excalidraw UMD assets must be placed in /app/ alongside index.html:
# - excalidraw.js (~1.2MB) — download from https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js
# - react.js (~11KB) — download from https://unpkg.com/react@18/umd/react.production.min.js
# - react-dom.js (~132KB) — download from https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
# - zh-CN.json (~25KB) — Excalidraw Chinese locale
#
COPY assets/excalidraw.js assets/react.js assets/react-dom.js assets/zh-CN.json /app/

EXPOSE 80

CMD ["node", "server.js"]
