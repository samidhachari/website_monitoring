# Use Playwright official image which includes browser deps
FROM mcr.microsoft.com/playwright:next

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Install Playwright browsers (image may already include; this is safe)
RUN npx playwright install --with-deps

# Build Next.js for production
RUN npm run build

# Expose port if needed (Render sets PORT env)
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]