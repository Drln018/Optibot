# Usa una imagen base de Node.js versión 19
FROM node:19

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de la aplicación
COPY . .

# Expone el puerto en el que corre tu aplicación (por defecto 3000)
EXPOSE 3000

# Comando por defecto para iniciar la aplicación
CMD ["npm", "start"]
