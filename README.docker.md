# Docker Deployment Guide

This guide explains how to deploy the AI Maturity Assessment application using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of available RAM

## Architecture

The Docker deployment consists of 5 containers:

1. **postgres** - PostgreSQL 16 database
2. **redis** - Redis 7 for BullMQ job queue
3. **app** - Next.js application (main web server)
4. **pdf-worker** - Background worker for PDF generation
5. **email-worker** - Background worker for email sending

## Quick Start

### 1. Configure Environment Variables

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` and configure the required variables:

```env
# Required: Generate a secure secret
NEXTAUTH_SECRET=your-secure-secret-here

# Required: Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@example.com

# Optional: Change if deploying to production
NEXTAUTH_URL=http://localhost:3000
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2. Build and Start Services

Build and start all containers:

```bash
docker-compose up -d
```

This will:
- Build the Docker images
- Start PostgreSQL and Redis
- Run database migrations
- Start the Next.js app
- Start PDF and Email workers

### 3. Verify Deployment

Check that all services are running:

```bash
docker-compose ps
```

You should see 5 containers running:
- ai-assessment-db
- ai-assessment-redis
- ai-assessment-app
- ai-assessment-pdf-worker
- ai-assessment-email-worker

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Docker Commands

### View Logs

All services:
```bash
docker-compose logs -f
```

Specific service:
```bash
docker-compose logs -f app
docker-compose logs -f pdf-worker
docker-compose logs -f email-worker
```

### Restart Services

Restart all:
```bash
docker-compose restart
```

Restart specific service:
```bash
docker-compose restart app
```

### Stop Services

```bash
docker-compose down
```

Stop and remove volumes (will delete all data):
```bash
docker-compose down -v
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

Rebuild specific service:
```bash
docker-compose up -d --build app
```

## Database Management

### Run Migrations

Migrations run automatically on container start. To run manually:

```bash
docker-compose exec app npx prisma migrate deploy
```

### Seed Database

```bash
docker-compose exec app npx prisma db seed
```

### Access Database

```bash
docker-compose exec postgres psql -U postgres -d ai_assessment
```

### Backup Database

```bash
docker-compose exec postgres pg_dump -U postgres ai_assessment > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres ai_assessment
```

## Redis Management

### Access Redis CLI

```bash
docker-compose exec redis redis-cli
```

### Monitor Redis

```bash
docker-compose exec redis redis-cli MONITOR
```

### Clear Redis Cache

```bash
docker-compose exec redis redis-cli FLUSHALL
```

## Production Deployment

### 1. Security Checklist

- [ ] Change default PostgreSQL password in `docker-compose.yml`
- [ ] Generate strong `NEXTAUTH_SECRET`
- [ ] Configure proper `NEXTAUTH_URL` with HTTPS
- [ ] Set up SSL/TLS certificates (use nginx reverse proxy)
- [ ] Review and restrict exposed ports
- [ ] Enable Docker secrets for sensitive data
- [ ] Configure firewall rules

### 2. Performance Optimization

Update `docker-compose.yml` resource limits:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```

### 3. Use Environment-Specific Compose Files

Create `docker-compose.prod.yml`:

```yaml
version: '3.9'
services:
  app:
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=https://yourdomain.com
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4. Set Up Reverse Proxy (nginx)

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs app
```

### Database Connection Issues

Verify PostgreSQL is healthy:
```bash
docker-compose exec postgres pg_isready -U postgres
```

### PDF Generation Not Working

Check Chromium installation in container:
```bash
docker-compose exec pdf-worker chromium-browser --version
```

### Worker Not Processing Jobs

Check Redis connection:
```bash
docker-compose exec redis redis-cli ping
```

View worker logs:
```bash
docker-compose logs -f pdf-worker
docker-compose logs -f email-worker
```

### Port Already in Use

If port 3000, 5432, or 6379 is already in use, modify `docker-compose.yml`:

```yaml
services:
  app:
    ports:
      - '3001:3000'  # Map to different host port
```

## Monitoring

### Health Checks

PostgreSQL:
```bash
docker-compose exec postgres pg_isready
```

Redis:
```bash
docker-compose exec redis redis-cli ping
```

### Resource Usage

```bash
docker stats
```

## Updating the Application

1. Pull latest code:
```bash
git pull
```

2. Rebuild and restart:
```bash
docker-compose up -d --build
```

3. Run migrations if needed:
```bash
docker-compose exec app npx prisma migrate deploy
```

## Cleanup

Remove all containers, volumes, and images:

```bash
docker-compose down -v --rmi all
```

## Support

For issues or questions, check:
- Application logs: `docker-compose logs`
- Docker status: `docker-compose ps`
- System resources: `docker stats`
