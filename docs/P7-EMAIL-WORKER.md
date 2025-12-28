# P7: Email Worker Implementation

## Overview

The Email Worker handles sending assessment reports via email with PDF attachments. It processes jobs from the `email-sending` queue and updates assessment status to `EMAIL_SENT` upon successful delivery.

## Features

- **Async Email Sending**: BullMQ-based queue processing
- **PDF Attachment**: Automatically attaches generated PDF reports
- **HTML Email Template**: Professional, responsive email design
- **Error Handling**: Retry mechanism with exponential backoff
- **Status Tracking**: Updates assessment status in database

## Architecture

```
┌─────────────────┐
│   API Endpoint  │
│   /api/submit   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Queue    │
│   (BullMQ)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Worker   │
│  (Background)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Nodemailer     │
│  SMTP Transport │
└─────────────────┘
```

## Files Created

1. **[workers/email-worker.ts](../workers/email-worker.ts)** - Main email worker implementation
2. **[scripts/test-email.ts](../scripts/test-email.ts)** - Testing script
3. **[lib/workers/queue.ts](../lib/workers/queue.ts)** - Updated with email queue and helper functions

## Environment Variables

Required SMTP configuration in `.env.local`:

```env
SMTP_HOST="smtp.gmail.com"          # Your SMTP server
SMTP_PORT="587"                      # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER="your-email@gmail.com"    # SMTP username
SMTP_PASSWORD="your-app-password"   # SMTP password or app password
SMTP_FROM="noreply@example.com"     # From email address
```

### Gmail Configuration Example

For Gmail, you need to:
1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password)

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx"  # 16-character app password
SMTP_FROM="your-email@gmail.com"
```

## Database Schema

Added `EMAIL_FAILED` status to `AssessmentStatus` enum:

```prisma
enum AssessmentStatus {
  DRAFT
  SUBMITTED
  PDF_GENERATED
  EMAIL_SENT
  FAILED
  EMAIL_FAILED  // New status
}
```

## Usage

### Starting the Email Worker

```bash
pnpm worker:email
```

The worker will:
- Connect to Redis
- Listen for jobs in the `email-sending` queue
- Process emails with 5 concurrent workers
- Rate limit to 20 emails per minute

### Enqueueing Email Jobs

```typescript
import { enqueueEmailSending } from '@/lib/workers/queue';

// Add email job to queue
const job = await enqueueEmailSending({
  assessmentId: 'clx123abc',
  priority: 5  // Optional, default is 5
});

console.log(`Email job enqueued: ${job.id}`);
```

### Checking Job Status

```typescript
import { getEmailJobStatus } from '@/lib/workers/queue';

const status = await getEmailJobStatus('email-clx123abc');

console.log(status);
// {
//   id: 'email-clx123abc',
//   state: 'completed',
//   data: { assessmentId: 'clx123abc' },
//   attemptsMade: 1,
//   processedOn: 1234567890,
//   finishedOn: 1234567891
// }
```

## Email Template

The worker sends a professional HTML email with:

- **Header**: Gradient banner with branding
- **Content**: Personalized greeting and results summary
- **Metrics**: Total score and maturity level
- **PDF Attachment**: Assessment report
- **Footer**: Disclaimer and copyright

### Maturity Levels

| Score Range | Maturity Level |
|-------------|----------------|
| 80-100      | Avanzato       |
| 60-79       | Intermedio     |
| 40-59       | Base           |
| 0-39        | Iniziale       |

## Testing

### Manual Testing

```bash
# Terminal 1: Start Redis (if not running)
docker-compose up redis

# Terminal 2: Start Email Worker
pnpm worker:email

# Terminal 3: Run test script
pnpm test:email
```

### Test Script Features

The test script ([scripts/test-email.ts](../scripts/test-email.ts)):
1. Finds an assessment with `PDF_GENERATED` status
2. Enqueues an email job
3. Monitors job progress
4. Verifies database status update
5. Reports success/failure

### Expected Output

```
🧪 Testing Email Worker

📊 Step 1: Finding an assessment with PDF generated...
✅ Found assessment: clx123abc
   Email: user@example.com
   PDF: /pdfs/assessment-clx123abc.pdf
   Status: PDF_GENERATED

📧 Step 2: Enqueueing email sending job...
✅ Job enqueued: email-clx123abc

⏳ Step 3: Waiting for email to be sent...
   [1/30] Job state: waiting
   [2/30] Job state: active
   [3/30] Job state: completed

✅ Email sent successfully!

📊 Final Assessment Status:
   ID: clx123abc
   Status: EMAIL_SENT
   Email Sent At: 2025-01-15T10:30:00.000Z
   Email: user@example.com

✅ TEST PASSED: Email worker is functioning correctly!
```

## Error Handling

### Retry Configuration

- **Attempts**: 3
- **Backoff**: Exponential (10s, 20s, 40s)
- **Failed Status**: Sets `EMAIL_FAILED` in database

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Authentication failed | Wrong SMTP credentials | Check SMTP_USER and SMTP_PASSWORD |
| Connection timeout | Network or firewall issue | Check SMTP_HOST and SMTP_PORT |
| PDF not found | PDF generation failed | Ensure PDF was generated first |
| No email address | Assessment missing email | Validate form requires email |

### Error Logs

```bash
❌ Error sending email for clx123abc: Authentication failed
   Check SMTP settings in .env.local
```

## Worker Configuration

```typescript
{
  connection: redis,
  concurrency: 5,           // Process 5 emails simultaneously
  limiter: {
    max: 20,                // Maximum 20 jobs
    duration: 60000         // Per 60 seconds (1 minute)
  }
}
```

## Integration with Full Flow

The email worker integrates into the complete assessment flow:

```
User submits → API creates assessment → PDF Worker generates PDF
                                              ↓
                                         EMAIL_GENERATED status
                                              ↓
                                         Email Worker sends email
                                              ↓
                                         EMAIL_SENT status
```

## Package.json Scripts

```json
{
  "worker:email": "tsx workers/email-worker.ts",
  "test:email": "tsx scripts/test-email.ts"
}
```

## Verification Checklist

- [x] Email worker file created
- [x] Email queue configured in `lib/workers/queue.ts`
- [x] Nodemailer transporter configured
- [x] HTML email template implemented
- [x] PDF attachment support
- [x] Database status updates (EMAIL_SENT, EMAIL_FAILED)
- [x] Error handling and retry logic
- [x] Test script created
- [x] Package.json scripts added
- [x] Environment variables documented
- [x] Prisma schema updated with EMAIL_FAILED status

## Next Steps

1. Configure SMTP settings in `.env.local`
2. Start the email worker: `pnpm worker:email`
3. Test with: `pnpm test:email`
4. Verify emails are being sent
5. Check spam folder if emails not received
6. Monitor worker logs for errors

## Production Considerations

- Use a dedicated email service (SendGrid, AWS SES, Mailgun)
- Implement email templates from database
- Add email tracking (opens, clicks)
- Set up email queue monitoring
- Configure proper SPF, DKIM, DMARC records
- Handle bounce and complaint notifications
- Add unsubscribe functionality if needed
