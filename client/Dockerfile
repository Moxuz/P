# app1/Dockerfile

# Use an official Node.js runtime as a base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install --production

# Copy the app source code
COPY . .

# Expose port (matching the one your app uses)
EXPOSE 3000

# Define environment variables (optional, can be set during run)
ENV PORT=3000

# Start the app
CMD ["npm", "start"]