# My Financial App - Modern Architecture

A full-stack personal finance management application built with a modern tech stack.

## 🏗️ Architecture

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Redux Toolkit** - Global state management
- **React Query (TanStack Query)** - Server state & caching
- **Material UI** - Ready-made components
- **Tailwind CSS** - Layout, spacing, responsiveness

### Backend
- **NestJS** - Progressive Node.js framework
- **Express** - Default NestJS HTTP server
- **JWT Authentication** - Secure user authentication
- **Swagger** - API documentation
- **Prisma ORM** - Type-safe database access

### Database
- **Supabase PostgreSQL** - Primary production database
- **Mock Repository** - Development fallback (no database required)
- **Firebase** - Optional (config-based switching)

### Repository Pattern
```
ITransactionRepository
    ├── SupabaseRepository (Prisma + PostgreSQL)
    ├── FirebaseRepository (Firebase Firestore)
    └── MockRepository (In-memory data)
```

## 📁 Project Structure

```
my-financial/
├── client/                 # React Frontend (TypeScript)
│   ├── src/
│   │   ├── api/           # API client & endpoints
│   │   ├── components/    # React components
│   │   ├── hooks/         # React Query & custom hooks
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store & slices
│   │   ├── types/         # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
│
└── server/                # NestJS Backend (TypeScript)
    ├── src/
    │   ├── auth/          # JWT authentication
    │   ├── transactions/  # Transactions CRUD
    │   │   ├── dto/
    │   │   └── repositories/
    │   ├── goals/         # Financial goals
    │   ├── categories/    # Categories
    │   ├── database/      # Prisma service
    │   ├── app.module.ts
    │   └── main.ts
    ├── prisma/
    │   └── schema.prisma
    ├── package.json
    └── tsconfig.json
```

## 🚀 Getting Started

### Quick Start
```bash
# Backend
cd server
npm install
cp .env.example .env
# Edit .env (see Configuration section)
npm run start:dev

# Frontend (in new terminal)
cd client
npm install
cp .env.example .env
npm start
```

Visit:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:5000/api/docs

## 📦 Installation Commands

### Backend Dependencies
```bash
cd server
npm install
```

Installs:
- NestJS framework (@nestjs/core, @nestjs/common, @nestjs/platform-express)
- Swagger (@nestjs/swagger)
- JWT & Passport (@nestjs/jwt, @nestjs/passport, passport-jwt)
- Prisma (@prisma/client, prisma)
- Authentication (bcrypt)
- Validation (class-validator, class-transformer)
- TypeScript & development tools

### Frontend Dependencies
```bash
cd client
npm install
```

Installs:
- React & React DOM (v19)
- TypeScript
- Redux Toolkit & React Redux
- TanStack Query (React Query)
- Material UI (@mui/material, @emotion/react, @emotion/styled)
- Tailwind CSS (tailwindcss, postcss, autoprefixer)
- Axios (HTTP client)
- Development tools

## ⚙️ Configuration

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myfinancial"
DB_PROVIDER="mock"  # Options: mock, supabase, firebase

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**For Development**: Use `DB_PROVIDER="mock"` - no database needed!

**For Supabase**: 
1. Create project at https://supabase.com
2. Get connection URL
3. Set `DB_PROVIDER="supabase"`
4. Run `npm run prisma:generate && npm run prisma:push`

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
```

## 🎯 Available Scripts

### Backend
```bash
npm run start:dev      # Development with watch mode
npm run start:prod     # Production mode
npm run build          # Build TypeScript
npm run prisma:generate # Generate Prisma Client
npm run prisma:push    # Push schema to DB
npm run prisma:studio  # Open Prisma Studio GUI
```

### Frontend
```bash
npm start              # Development server
npm run build          # Production build
npm test               # Run tests
```

## 📚 API Endpoints

Full API documentation available at: **http://localhost:5000/api/docs**

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Goals
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create goal
- `PATCH /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## 🌟 Key Features

### Backend
- ✅ NestJS modular architecture
- ✅ Repository pattern for database abstraction
- ✅ Multiple database provider support (Supabase/Firebase/Mock)
- ✅ JWT authentication with bcrypt
- ✅ Swagger API documentation
- ✅ Type-safe with TypeScript
- ✅ Prisma ORM with PostgreSQL
- ✅ Validation with class-validator

### Frontend  
- ✅ React 19 with TypeScript
- ✅ Redux Toolkit for global state
- ✅ React Query for server state & caching
- ✅ Material UI components
- ✅ Tailwind CSS for styling
- ✅ Axios with interceptors
- ✅ Type-safe API client
- ✅ Custom React hooks

## 🛠️ Tech Stack Rationale

**Why NestJS?**
- Enterprise-grade architecture
- Built-in TypeScript support
- Modular and scalable
- Excellent documentation

**Why Prisma?**
- Type-safe database queries
- Auto-generated types
- Easy migrations
- Great developer experience

**Why Redux Toolkit + React Query?**
- Redux Toolkit: Global UI state (auth, modals)
- React Query: Server state (caching, refetching)
- Clear separation of concerns

**Why Material UI + Tailwind?**
- Material UI: Complex components (tables, modals)
- Tailwind: Quick layouts, spacing, responsive design
- Best of both worlds

## 🔧 Development Tips

1. **Use Mock Provider**: Start with `DB_PROVIDER="mock"` for quick development
2. **API Documentation**: Check Swagger docs for all endpoints
3. **Redux DevTools**: Install browser extension for state debugging
4. **React Query DevTools**: Included - toggle to see cache state
5. **Prisma Studio**: Run `npm run prisma:studio` for GUI database viewer

## 🐛 Troubleshooting

**Backend won't start:**
- Check port 5000 is free
- Verify `.env` file exists
- Run `npm install` again

**Frontend won't start:**
- Check port 3000 is free
- Clear `node_modules` and reinstall
- Verify TypeScript version compatibility

**TypeScript errors:**
- Run `npm run prisma:generate` in server
- Delete `node_modules` and reinstall

**Database issues:**
- Switch to `DB_PROVIDER="mock"` for testing
- Verify DATABASE_URL is correct
- Check Supabase project is active

## 📄 License

ISC

---

**See [INSTALLATION.md](INSTALLATION.md) for detailed setup guide**
