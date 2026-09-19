FROM node:20-bullseye

# System deps for Word/Excel conversion (LibreOffice) and PDF encryption (qpdf)
RUN apt-get update && apt-get install -y \
    libreoffice \
    qpdf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
