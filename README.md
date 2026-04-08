# Ultra Smart Shop - Backend

This is the backend repository for the Ultra Smart Shop POS system, built with Node.js, Express, and Prisma.

## 🚀 GitHub Repository Setup

To push this backend project to a separate GitHub repository, run these commands inside the `backend` folder:

```bash
# 1. Initialize git
git init

# 2. Add files
git add .

# 3. Create the first commit
git commit -m "Initial commit - Backend"

# 4. Link to your GitHub repository (Replace with your actual repo URL)
git remote add origin https://github.com/YOUR-USERNAME/ultra-smart-shop-backend.git

# 5. Push the code
git branch -M main
git push -u origin main
```

## 🌍 Deployment on Contabo Server

Since the backend and frontend are now in separate repositories, you will clone them individually on the server.

1. **SSH into your Contabo VPS:**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Navigate to the app directory:**
   ```bash
   mkdir -p /opt/ultra-smart-shop
   cd /opt/ultra-smart-shop
   ```

3. **Clone this Backend repository:**
   *(If the `backend` folder already exists, delete it first `rm -rf backend`)*
   ```bash
   git clone https://github.com/YOUR-USERNAME/ultra-smart-shop-backend.git backend
   ```

4. **Environment Variables:**
   Configure your `.env` file inside the `backend` folder:
   ```bash
   cd backend
   nano .env
   ```
   Provide your database URL, JWT secrets, etc. as defined in `.env.example`.

5. **Install & Build:**
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   npm run build
   ```

6. **Start with PM2:**
   If you have the `ecosystem.config.cjs` setup, run:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   ```
   Or explicitly start the backend:
   ```bash
   pm2 start dist/index.js --name uss-api
   pm2 save
   ```

To deploy future updates:
```bash
cd /opt/ultra-smart-shop/backend
git pull origin main
npm install
npm run build
pm2 restart uss-api
```

---

## 🗑️ Data Reset (After Demo — Before Real Use)

After demoing the system, run this to wipe all sample data while keeping shop settings and user accounts intact:

```bash
cd backend
npx tsx prisma/reset-data.ts
```

### What gets removed vs preserved:

| Removed | Preserved |
|---------|-----------|
| Products, Product Variants | Shop (name, address, phone, email, barcode settings) |
| Categories, Brands | All User accounts (passwords, roles, active status) |
| Invoices, Invoice Items | |
| Stock Movements | |
| Customers, Suppliers | |

> **Note:** Run this command from inside the `backend` folder. On the Contabo server, the path would be `/opt/ultra-smart-shop/backend`.
> ```bash
> cd /opt/ultra-smart-shop/backend
> npx tsx prisma/reset-data.ts
> ```
