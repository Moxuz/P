FROM node:18

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    build-essential \
    python3

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production
RUN npm install --build-from-source snappy
# Copy the rest of your application code
COPY . .

# Expose the required port
EXPOSE 5000

# Run the server
CMD ["node", "server.js"]
