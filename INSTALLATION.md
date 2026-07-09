# Installation Guide

Follow these steps to install and set up your My Financial application.

## Step 1: Backend Installation

```bash
cd server
npm install
```

This will install all the NestJS dependencies including:
- @nestjs/core, @nestjs/common, @nestjs/platform-express
- @nestjs/config, @nestjs/swagger
- @nestjs/jwt, @nestjs/passport
- @prisma/client
- passport, passport-jwt, bcrypt
- class-validator, class-transformer
- And all development dependencies

## Step 2: Frontend Installation

```bash
cd client
npm install
```

This will install all the React dependencies including:
- react, react-dom
- @reduxjs/toolkit, react-redux
- @tanstack/react-query
- @mui/material, @emotion/react, @emotion/styled
- tailwindcss, postcss, autoprefixer
- axios, typescript
- And all development dependencies

## Step 3: Environment Setup

### Backend Environment
```bash
cd server
cp .env.example .env
```

Edit the `.env` file:
- Set `DB_PROVIDER="mock"` for development (no database needed)
- Generate a secure `JWT_SECRET` (you can use: `openssl rand -base64 32`)

### Frontend Environment
```bash
cd client
cp .env.example .env
```

The default settings should work for local development.

## Step 4: Database Setup (Optional for Mock)

### Using Mock Database (Recommended for Development)
No additional setup needed! Just ensure `DB_PROVIDER="mock"` in your `.env` file.

### Using Supabase (For Production)
1. Create account at https://supabase.com
2. Create a new project
3. Get connection string from Project Settings > Database
4. Update `DATABASE_URL` in `.env`
5. Set `DB_PROVIDER="supabase"`
6. Run:
   ```bash
   cd server
   npm run prisma:generate
   npm run prisma:push
   ```

## Step 5: Verify Installation

Check for any installation errors and ensure all dependencies are installed correctly.

## Next Steps

After installation, you can start the application:

1. **Start Backend:**
   ```bash
   cd server
   npm run start:dev
   ```

2. **Start Frontend:** (in a new terminal)
   ```bash
   cd client
   npm start
   ```

Visit:
- Frontend: http://localhost:3000
- Backend API Docs: http://localhost:5000/api/docs

## Common Issues

### If you see TypeScript errors:
```bash
cd server
npm run prisma:generate
```

### If ports are in use:
- Backend: Edit `PORT` in `server/.env`
- Frontend: Set `PORT` environment variable before starting

### If you see module not found errors:
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again
