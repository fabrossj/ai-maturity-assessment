# AI Maturity Assessment

A comprehensive web application for assessing organizational AI maturity levels through structured questionnaires, automated scoring, and detailed PDF reports.

## Features

- Multi-version questionnaire management with draft/published/archived states
- Dynamic assessment flow with progress tracking
- Automated maturity scoring across multiple dimensions
- PDF report generation with charts and recommendations
- Email notifications with BullMQ queue processing
- Admin dashboard for questionnaire management
- Security hardening with rate limiting and input validation
- Docker deployment with multi-container orchestration

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL 16
- **Queue System**: BullMQ + Redis 7
- **PDF Generation**: Puppeteer
- **Authentication**: NextAuth.js v5
- **Email**: Nodemailer
- **Testing**: Vitest + Coverage
- **Deployment**: Docker + Docker Compose

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │  API Routes  │  │  NextAuth    │  │
│  │  (React UI)  │──│  (Business)  │──│  (Auth)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                    │
           │                    ├──────────────┐
           ▼                    ▼              ▼
    ┌─────────────┐      ┌─────────────┐  ┌─────────────┐
    │  PostgreSQL │      │    Redis    │  │   Workers   │
    │  (Prisma)   │      │  (BullMQ)   │  │ PDF + Email │
    └─────────────┘      └─────────────┘  └─────────────┘
```

### Database Schema

- **QuestionnaireVersion**: Multi-version questionnaire management
- **Area**: Assessment dimensions (Strategy, Data, Technology, etc.)
- **Element**: Sub-categories within each area
- **Question**: Individual assessment questions
- **AssessmentResponse**: User assessment sessions
- **Answer**: Individual question responses

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- Docker and Docker Compose
- Git

### Local Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-maturity-assessment
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.template .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_assessment?schema=public
REDIS_URL=redis://localhost:6379

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-in-production

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@example.com

UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=local_development_token
```

4. Start infrastructure (Postgres + Redis):
```bash
docker-compose up -d postgres redis
```

5. Run database migrations:
```bash
pnpm prisma migrate dev
```

6. Seed the database (optional):
```bash
pnpm db:seed
```

7. Start the development server:
```bash
pnpm dev
```

8. In separate terminals, start the workers:
```bash
pnpm worker:pdf
pnpm worker:email
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Docker Deployment

For production deployment with all services:

1. Configure environment:
```bash
cp .env.docker .env
```

2. Update `.env` with production values:
   - Generate secure secret: `openssl rand -base64 32`
   - Configure SMTP settings
   - Set NEXTAUTH_URL to your domain

3. Build and start all services:
```bash
docker-compose up -d
```

This will start:
- Next.js application (port 3000)
- PostgreSQL database (port 5432)
- Redis (port 6379)
- PDF worker (background)
- Email worker (background)

4. Check service health:
```bash
docker-compose ps
curl http://localhost:3000/api/health
```

### Updating Docker Deployment

After code changes, rebuild the containers:

```bash
# Full rebuild (recommended after significant changes)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Or rebuild only workers (faster)
docker-compose build --no-cache pdf-worker email-worker
docker-compose up -d pdf-worker email-worker
```

See [Deployment Update Guide](docs/DEPLOYMENT_UPDATE.md) for detailed instructions.

## Available Scripts

### Development
- `pnpm dev` - Start Next.js development server
- `pnpm build` - Build production bundle
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Database
- `pnpm prisma migrate dev` - Run migrations in development
- `pnpm prisma migrate deploy` - Run migrations in production
- `pnpm prisma studio` - Open Prisma Studio GUI
- `pnpm db:seed` - Seed database with sample data

### Workers
- `pnpm worker:pdf` - Start PDF generation worker
- `pnpm worker:email` - Start email notification worker
- `pnpm email:retry` - Retry sending emails for assessments with PDF but no email sent

### Testing
- `pnpm test` - Run tests in watch mode
- `pnpm test:unit` - Run unit tests
- `pnpm test:integration` - Run integration tests
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:flow` - Test complete assessment flow
- `pnpm test:api` - Test all API endpoints
- `pnpm test:pdf` - Test PDF generation
- `pnpm test:email` - Test email functionality
- `pnpm test:security` - Run security tests
- `pnpm test:all` - Run all tests

## API Reference

### Public Endpoints

#### Get Latest Questionnaire
```http
GET /api/questionnaire/latest
```

Returns the latest published questionnaire version with all areas, elements, and questions.

#### Create Assessment
```http
POST /api/assessment
Content-Type: application/json

{
  "email": "user@example.com",
  "companyName": "Example Corp"
}
```

Creates a new assessment session and returns the assessment ID.

#### Submit Answer
```http
POST /api/assessment/{id}
Content-Type: application/json

{
  "questionId": "clxxx...",
  "value": 3
}
```

Submit an answer (value: 1-5) for a specific question.

#### Submit Assessment
```http
POST /api/assessment/{id}/submit
```

Finalizes the assessment, calculates scores, and triggers PDF/email generation.

#### Get Results
```http
GET /api/assessment/{id}/results
```

Returns calculated scores and maturity levels for all areas.

#### Generate PDF
```http
GET /api/assessment/{id}/pdf
```

Triggers PDF generation job (returns job ID) or downloads existing PDF.

### Admin Endpoints

All admin endpoints require authentication.

#### Questionnaire Management
```http
GET    /api/admin/questionnaire           # List all versions
POST   /api/admin/questionnaire           # Create new version
GET    /api/admin/questionnaire/{id}      # Get version details
PUT    /api/admin/questionnaire/{id}      # Update version
DELETE /api/admin/questionnaire/{id}      # Delete version

POST   /api/admin/questionnaire/{id}/publish  # Publish version
POST   /api/admin/questionnaire/{id}/archive  # Archive version
POST   /api/admin/questionnaire/{id}/clone    # Clone version
POST   /api/admin/questionnaire/{id}/validate # Validate structure
```

#### Area Management
```http
PUT    /api/admin/questionnaire/{id}/area/{areaId}
DELETE /api/admin/questionnaire/{id}/area/{areaId}
```

#### Element Management
```http
PUT    /api/admin/questionnaire/{id}/element/{elementId}
DELETE /api/admin/questionnaire/{id}/element/{elementId}
```

#### Question Management
```http
PUT    /api/admin/questionnaire/{id}/question/{questionId}
DELETE /api/admin/questionnaire/{id}/question/{questionId}
```

#### Queue Status
```http
GET /api/admin/queue/status
```

Returns BullMQ queue statistics (waiting, active, completed, failed jobs).

### Health Check
```http
GET /api/health
```

Returns system health status including database and Redis connectivity.

## Project Structure

```
ai-maturity-assessment/
├── app/
│   ├── api/                    # API routes
│   │   ├── admin/             # Admin endpoints
│   │   ├── assessment/        # Assessment endpoints
│   │   ├── questionnaire/     # Questionnaire endpoints
│   │   └── health/            # Health check
│   ├── assessment/            # Assessment UI pages
│   └── layout.tsx             # Root layout
├── components/                # React components
│   ├── assessment/           # Assessment-specific components
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── prisma.ts            # Prisma client
│   ├── redis.ts             # Redis client
│   ├── queue.ts             # BullMQ queue setup
│   ├── scoring.ts           # Scoring algorithms
│   └── email.ts             # Email utilities
├── workers/
│   ├── pdf-worker.ts        # PDF generation worker
│   └── email-worker.ts      # Email notification worker
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration files
│   └── seed.ts              # Seed script
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── scripts/                # Utility scripts
├── docs/                   # Documentation
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # App container
└── Dockerfile.worker       # Worker container
```

## Configuration

### Environment Variables

#### Required
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - Authentication secret (min 32 chars)
- `NEXTAUTH_URL` - Application URL

#### Optional
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `SMTP_FROM` - From email address
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL (for rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token

### Security Features

- Rate limiting on API endpoints (10 requests/minute)
- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS protection with React sanitization
- CORS configuration
- Secure headers
- Authentication with NextAuth.js

## Troubleshooting

### Database Connection Issues
```bash
# Check if Postgres is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d postgres
pnpm prisma migrate dev
```

### Redis Connection Issues
```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
redis-cli ping

# View logs
docker-compose logs redis
```

### Worker Issues
```bash
# Check worker logs
docker-compose logs pdf-worker
docker-compose logs email-worker

# Restart workers
docker-compose restart pdf-worker email-worker

# Retry pending emails (for assessments with PDF but no email sent)
pnpm email:retry
```

### PDF Generation Failures
- Ensure sufficient memory for Puppeteer (min 512MB)
- Check Chrome/Chromium dependencies in container
- Verify `/tmp` write permissions

### Email Not Sending
```bash
# Check if email worker is running
docker-compose ps email-worker
# or for local development
ps aux | grep email-worker

# Verify SMTP configuration in .env.local
cat .env.local | grep SMTP

# Check email worker logs for errors
docker-compose logs email-worker --tail 50

# Retry pending emails
pnpm email:retry
```

**Common Issues:**
- SMTP credentials incorrect → Check `SMTP_USER` and `SMTP_PASSWORD`
- Gmail App Password required → Don't use regular password, generate App Password
- Email worker not running → Start with `pnpm worker:email`
- PDF not generated yet → Email only sends after PDF is generated

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

## Development Workflow

### Adding a New Migration
```bash
pnpm prisma migrate dev --name your_migration_name
```

### Testing
```bash
# Run all tests
pnpm test:all

# Run specific test file
pnpm vitest run tests/unit/scoring.test.ts

# Watch mode
pnpm test
```

### Code Quality
```bash
# Lint code
pnpm lint

# Format code (if Prettier is configured)
pnpm format
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass: `pnpm test:all`
4. Run linting: `pnpm lint`
5. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team or create an issue in the repository.
