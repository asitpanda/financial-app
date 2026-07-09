# Quick Installation Commands

Copy and paste these commands to install your My Financial application.

## Backend Installation

```bash
cd server
npm install
cp .env.example .env
```

After running the above, edit `server/.env` and set:
- `DB_PROVIDER="mock"` (for development, no database needed)
- `JWT_SECRET="your-secret-key"` (generate with: `openssl rand -base64 32`)

## Frontend Installation

```bash
cd client
npm install
cp .env.example .env
```

The default `.env` settings should work for local development.

## Start Development Servers

### Terminal 1: Backend
```bash
cd server
npm run start:dev
```

### Terminal 2: Frontend
```bash
cd client
npm start
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api/docs

## Optional: Setup Supabase (Production Database)

If you want to use a real database instead of mock data:

1. Create account at https://supabase.com
2. Create a new project
3. Get connection string from Project Settings > Database
4. Edit `server/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   DB_PROVIDER="supabase"
   ```
5. Run migrations:
   ```bash
   cd server
   npm run prisma:generate
   npm run prisma:push
   ```

## Verification

After installation:
1. Backend should start on port 5000
2. Frontend should start on port 3000
3. Visit http://localhost:5000/api/docs to see API documentation
4. Visit http://localhost:3000 to see the application

## Troubleshooting

### Port already in use
```bash
# Find and kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Find and kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Clear and reinstall
```bash
# Backend
cd server
rm -rf node_modules package-lock.json
npm install

# Frontend
cd client
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
cd server
npm run prisma:generate
```

## Summary of Installed Packages

### Backend (server/)
- NestJS framework & modules
- Prisma ORM
- JWT & Passport authentication
- Swagger for API docs
- TypeScript
- Validation & transformation tools

### Frontend (client/)
- React 19 with TypeScript
- Redux Toolkit
- TanStack Query (React Query)
- Material UI
- Tailwind CSS
- Axios

---

For detailed documentation, see [README.md](README.md) and [INSTALLATION.md](INSTALLATION.md)
