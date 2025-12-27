# PDF Generation Worker

This directory contains the background worker for generating PDF reports.

## Architecture

- **[pdf-worker.ts](pdf-worker.ts)** - BullMQ worker that processes PDF generation jobs
- **[../lib/workers/pdf-generator.ts](../lib/workers/pdf-generator.ts)** - Core PDF generation logic using Puppeteer
- **[../lib/workers/redis.ts](../lib/workers/redis.ts)** - Redis connection configuration
- **[../lib/workers/queue.ts](../lib/workers/queue.ts)** - Queue management utilities

## Prerequisites

1. **Redis server running**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine

   # Or install locally
   # Windows: https://github.com/microsoftarchive/redis/releases
   # Mac: brew install redis && brew services start redis
   # Linux: sudo apt-get install redis-server
   ```

2. **Environment variables in .env**
   ```bash
   REDIS_URL="redis://localhost:6379"
   DATABASE_URL="postgresql://..."
   ```

## Running the Worker

### Development
```bash
# Start the PDF worker
pnpm worker:pdf

# Or with tsx directly
pnpm tsx workers/pdf-worker.ts
```

### Production
```bash
# Build and run
pnpm build
NODE_ENV=production pnpm worker:pdf
```

### Background Mode
```bash
# Run in background (Linux/Mac)
pnpm worker:pdf &

# Windows (using start)
start /B pnpm worker:pdf
```

## How It Works

1. **Assessment Submission** → User submits an assessment via POST `/api/assessment/:id/submit`
2. **Score Calculation** → Server calculates scores and updates database
3. **Job Enqueued** → A PDF generation job is added to the `pdf-generation` queue
4. **Worker Processing** → The worker picks up the job and generates the PDF using Puppeteer
5. **PDF Storage** → PDF is saved to `public/pdfs/assessment-{id}.pdf`
6. **Status Update** → Assessment status is updated to `PDF_GENERATED`

## Testing

### Test PDF Generation Directly
```bash
pnpm tsx scripts/test-pdf.ts
```

This will:
- Find the most recent submitted assessment
- Generate a PDF for it
- Save it to `public/pdfs/`
- Display the URL to view it

### Manual Testing Flow

1. **Start Redis** (if not running)
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Start the PDF worker**
   ```bash
   pnpm worker:pdf
   ```

3. **Start the Next.js app**
   ```bash
   pnpm dev
   ```

4. **Submit an assessment** via the web interface

5. **Check the worker logs** - you should see:
   ```
   📄 Processing PDF generation for assessment: abc123
   ✅ PDF generated: assessment-abc123.pdf
   ✅ Assessment abc123 status updated to PDF_GENERATED
   ```

6. **View the PDF** at `http://localhost:3000/pdfs/assessment-{id}.pdf`

## Monitoring

### Check Queue Status
You can use the BullMQ CLI or create a dashboard:

```bash
# Install BullMQ CLI
npm install -g bullmq-cli

# Monitor queue
bullmq-cli --redis redis://localhost:6379 --queue pdf-generation
```

### Check Redis
```bash
redis-cli
> KEYS *pdf-generation*
> GET bull:pdf-generation:...
```

## Troubleshooting

### Worker Not Processing Jobs
- Check if Redis is running: `redis-cli ping` (should return `PONG`)
- Check Redis connection in worker logs
- Verify REDIS_URL in .env

### PDF Generation Fails
- Check Puppeteer dependencies (Chrome/Chromium)
- On Linux, you may need to install additional libraries:
  ```bash
  sudo apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
  ```

### Assessment Not Found
- Ensure the assessment exists and has `calculatedScores`
- Check that the assessment was submitted (status: `SUBMITTED`)

## Configuration

### Queue Options
Edit [../lib/workers/queue.ts](../lib/workers/queue.ts):
- `attempts`: Number of retry attempts (default: 3)
- `backoff`: Retry delay strategy
- `removeOnComplete`: Job retention policy

### Worker Concurrency
Edit [pdf-worker.ts](pdf-worker.ts):
- `concurrency`: Number of parallel jobs (default: 2)
- `limiter`: Rate limiting (default: 10 jobs per minute)

### PDF Styling
Edit [../lib/workers/pdf-generator.ts](../lib/workers/pdf-generator.ts) to customize the HTML/CSS template.

## Production Deployment

### Using PM2
```bash
npm install -g pm2

# Start worker
pm2 start pnpm --name "pdf-worker" -- worker:pdf

# Monitor
pm2 logs pdf-worker
pm2 monit

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Using Docker
```dockerfile
# Add to your Dockerfile
CMD ["sh", "-c", "pnpm worker:pdf & pnpm start"]
```

### Using systemd (Linux)
Create `/etc/systemd/system/pdf-worker.service`:
```ini
[Unit]
Description=PDF Generation Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/app
ExecStart=/usr/bin/pnpm worker:pdf
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable pdf-worker
sudo systemctl start pdf-worker
sudo systemctl status pdf-worker
```

## Security Considerations

- PDFs are stored in `public/pdfs/` and are publicly accessible by URL
- Consider implementing authentication/authorization for PDF access
- Add periodic cleanup of old PDFs to save disk space
- Use signed URLs or token-based access for sensitive reports

## Future Enhancements

- [ ] Email delivery after PDF generation
- [ ] Custom PDF templates per assessment type
- [ ] PDF watermarking
- [ ] Signed URLs for secure access
- [ ] Scheduled PDF cleanup job
- [ ] Admin dashboard for queue monitoring
