# ---- base image ----
FROM node:18

# βάζουμε έναν μη-privileged χρήστη για ασφάλεια (προαιρετικό)
# RUN useradd -m appuser
# USER appuser

# ---- working dir ----
WORKDIR /app

# ---- install only deps first (better caching) ----
COPY package*.json ./
# Αν έχεις package-lock.json προτιμάται:
# NPM v9+: --omit=dev για production
RUN npm ci --omit=dev || npm install --only=production

# ---- copy source ----
COPY . .

# Προαιρετικό: ρύθμισε NODE_ENV
ENV NODE_ENV=production

# Πες στο Docker ποιο port ακούει ο server (πληροφοριακό)
EXPOSE 5000

# Εκκίνηση (πρέπει να υπάρχει "start" στο package.json)
CMD ["npm", "start"]
