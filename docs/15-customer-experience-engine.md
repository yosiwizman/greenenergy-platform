# Customer Experience Engine v1

**Status**: ✅ Implemented (Phase 4, Sprint 1)

## Overview

The Customer Experience Engine provides a structured timeline of customer-facing messages for each job. This sprint implements the foundational data model, internal APIs for operations staff to create messages, and customer portal integration so homeowners can view their message history.

**This is NOT a full notification system yet**—we are not sending emails or SMS. Instead, we're building the timeline infrastructure and message generation capabilities that can be hooked into actual delivery channels in future sprints.

## Architecture

### Data Model

**CustomerMessage** (in Prisma schema):
- `id`: UUID primary key
- `jobId`: Foreign key to Job
- `type`: Enum (`STATUS_UPDATE`, `ETA_UPDATE`, `GENERIC`)
- `channel`: Enum (`PORTAL`, `EMAIL`, `SMS`) - indicates intended delivery method
- `source`: Enum (`SYSTEM`, `HUMAN`, `AI_SUGGESTED`) - tracks message origin
- `title`: Short subject line
- `body`: Full message content
- `createdAt`: Timestamp
- `readAt`: Nullable timestamp (tracks when customer viewed it)
- `metadataJson`: JSONB for extensibility (e.g., tone, custom prompts for AI messages)

### Service Layer

**CustomerExperienceService** (`apps/core-api/src/modules/customer-experience/customer-experience.service.ts`):

**Methods**:
- `getMessagesForJob(jobId)`: Fetches all messages for a job, ordered chronologically (createdAt ASC)
- `createMessageForJob(jobId, input)`: Creates a new message with default channel=PORTAL, source=HUMAN
- `markMessagesReadForJob(jobId)`: Sets readAt timestamp for all unread messages
- `createAutoMessageFromAi(jobId, options)`: Generates AI-powered message content using existing `AiOperationsService.generateCustomerMessage()`, saves with source=AI_SUGGESTED

**Title Generation** (automatic based on message type):
- `STATUS_UPDATE` → "Project Status Update"
- `ETA_UPDATE` → "Installation Timeline Update"
- `GENERIC` → "Message from Your Solar Team"

### API Endpoints

#### Internal API (protected by InternalApiKeyGuard)
- **GET** `/api/v1/cx/jobs/:jobId/messages` - List all messages
- **POST** `/api/v1/cx/jobs/:jobId/messages` - Create manual message (body: `CreateCustomerMessageInput`)
- **POST** `/api/v1/cx/jobs/:jobId/messages/ai` - Generate AI message (body: `{messageType, tone?, customPrompt?}`)
- **POST** `/api/v1/cx/jobs/:jobId/read` - Mark messages read (internal use only)

#### Customer Portal API (session-protected)
- **GET** `/api/v1/portal/jobs/:jobId/messages` - Fetch messages for authenticated customer
- **POST** `/api/v1/portal/jobs/:jobId/messages/read` - Mark messages read after viewing

### Frontend Integration

**Customer Portal** (`apps/customer-portal`):
- Added "Messages" tab to job detail page
- Timeline view displays:
  - Message type badge (STATUS_UPDATE, ETA_UPDATE, GENERIC)
  - AI-assisted indicator for AI_SUGGESTED messages
  - Title and body
  - Relative timestamp (e.g., "2 hours ago")
- Automatically marks messages as read when tab is opened
- Shows message count badge on tab button

## AI Integration

No new LLM dependency. The engine reuses the existing `AiOperationsService.generateCustomerMessage()` method (already implemented in Phase 3 Sprint 5). When operations staff request an AI-generated message:

1. Service calls `AiOperationsService.generateCustomerMessage(jobId, {type, tone, customQuestion})`
2. AI generates personalized message based on job context
3. Message is saved with `source: 'AI_SUGGESTED'` and metadata tracking tone/custom prompt
4. Operations can review, edit, or send as-is in future sprints

## Use Cases

**For Operations Staff** (via internal API or future Command Center UI):
- Create status updates for homeowners ("Your panels have been ordered")
- Generate ETA messages when timelines shift
- Draft generic messages (e.g., holiday greetings, maintenance reminders)
- Use AI suggestions to quickly compose professional, context-aware messages

**For Homeowners** (via customer portal):
- View chronological message history for their job
- See status updates and timeline changes in one place
- Distinguish between system messages, human-written messages, and AI-assisted drafts
- Mark messages as read

## Email Channel & Notifications (Phase 4 Sprint 2)

**Status**: ✅ Implemented

The CX Engine now supports sending transactional emails via the EMAIL channel using Resend as the email provider.

### Behavior

- Messages are **always stored** in the CustomerMessage timeline
- Email is **only sent** when:
  - `channel === 'EMAIL'`
  - `sendEmail === true` (in CreateCustomerMessageInput)
  - Customer email can be resolved from Contact or CustomerUser
- If no customer email is found:
  - System logs a warning
  - Email sending is skipped gracefully
  - Message is still stored in the timeline

### Email Provider Configuration

**Environment Variables** (required for email sending):

```env
NOTIFICATIONS_EMAIL_PROVIDER="resend"      # Email provider (currently only 'resend' supported)
RESEND_API_KEY="your_resend_api_key"       # Resend API key (get from resend.com)
NOTIFICATIONS_FROM_EMAIL="no-reply@yourdomain.com"  # Verified sender email
```

**Provider Setup**:

1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain
3. Get your API key from the dashboard
4. Add environment variables to staging/production environments
5. **Important**: Never commit API keys to git

### Email Service Architecture

**NotificationsModule** (`apps/core-api/src/modules/notifications/`):

- `EmailNotificationService`: Provider-agnostic email service
  - Wraps Resend SDK behind clean interface
  - No-op behavior when credentials missing (logs warning, doesn't throw)
  - Can be swapped to different providers (SendGrid, Mailgun) in future
  - Sends plain-text emails (HTML templates can be added later)

**Customer Email Resolution**:

1. Primary contact with email (Contact.isPrimary = true)
2. Any contact with email
3. CustomerUser email (portal user)

### Email Content Format

**Subject**: `Green Energy update for Job #<jobId>: <messageTitle>`

**Body** (plain text):

```
Hello,

<messageBody>

Job Reference: #<jobId>

(This message was AI-assisted)  // Only if isAiGenerated=true

---
Green Energy Solar
Your trusted solar installation partner
```

### Usage Example

**Create message with email sending**:

```bash
curl -X POST http://localhost:3000/api/v1/cx/jobs/<jobId>/messages \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: your-internal-api-key" \
  -d '{
    "type": "STATUS_UPDATE",
    "channel": "EMAIL",
    "title": "Your Solar Installation Update",
    "body": "Your panels have been delivered and installation is scheduled for next week.",
    "sendEmail": true
  }'
```

**Create message without email sending** (store only):

```bash
curl -X POST http://localhost:3000/api/v1/cx/jobs/<jobId>/messages \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: your-internal-api-key" \
  -d '{
    "type": "STATUS_UPDATE",
    "channel": "EMAIL",
    "title": "Draft Status Update",
    "body": "Draft message for review",
    "sendEmail": false
  }'
```

### Testing

**Unit Tests** (`apps/core-api/src/modules/notifications/__tests__/email-notification.service.spec.ts`):
- Tests with valid Resend configuration
- Tests with missing API key (no-op behavior)
- Tests with missing FROM email (no-op behavior)
- Tests with unsupported provider (no-op behavior)
- All tests mock Resend SDK (no real HTTP calls)

**CustomerExperienceService Tests** (updated):
- Email sent when channel=EMAIL, sendEmail=true, customer email found
- Email NOT sent when channel=EMAIL, sendEmail=false
- Email NOT sent when channel=PORTAL regardless of sendEmail flag
- No errors thrown when customer email missing

**Manual Testing** (staging/local with valid credentials):
1. Set up Resend account and verify domain
2. Add environment variables to `.env`
3. Create message with `channel: 'EMAIL'` and `sendEmail: true`
4. Verify email received at customer address
5. Check logs for email sending confirmation

### Files Added (Phase 4 Sprint 2)

**Backend**:
- `apps/core-api/src/modules/notifications/notifications.module.ts` (new)
- `apps/core-api/src/modules/notifications/email-notification.service.ts` (new)
- `apps/core-api/src/modules/notifications/__tests__/email-notification.service.spec.ts` (new)
- `apps/core-api/src/modules/customer-experience/customer-experience.module.ts` (updated: imports NotificationsModule)
- `apps/core-api/src/modules/customer-experience/customer-experience.service.ts` (updated: integrates email sending)
- `apps/core-api/src/modules/customer-experience/__tests__/customer-experience.service.spec.ts` (updated: adds email tests)

**Shared Types**:
- `packages/shared-types/src/index.ts` (updated: added `sendEmail?: boolean` to CreateCustomerMessageInput)

**Configuration**:
- `apps/core-api/.env.example` (updated: added notification env vars)

### Security & Best Practices

- **API keys stored in environment variables only** (never in code/git)
- Email provider credentials secured in Railway/Vercel secrets
- Graceful degradation: missing config doesn't crash production
- Email failures logged but don't break message creation
- Plain-text emails (no tracking pixels, no HTML injection risks)

## Future Enhancements

**Phase 4, Sprint 3+ (Planned)**:
- SMS delivery channel (Twilio integration)
- HTML email templates with branding
- Message templates: Predefined templates for common scenarios
- Bulk messaging: Send updates to all customers with active jobs
- Message approval workflow: Review queue for AI-suggested messages before delivery
- Webhooks: Trigger messages based on job status changes or workflow completions
- Analytics: Track read rates, response times, customer satisfaction
- Email open tracking and click analytics

## Testing

**Unit Tests** (`apps/core-api/src/modules/customer-experience/__tests__/customer-experience.service.spec.ts`):
- Covers all service methods
- Mocks Prisma and AiOperationsService
- Validates default values (channel=PORTAL, source=HUMAN)
- Tests AI message generation with different tones and prompts
- Verifies chronological ordering and DTO mapping

**Manual Testing**:
1. Create messages via internal API using curl/Postman
2. Verify messages appear in customer portal under Messages tab
3. Test AI generation with different message types and tones
4. Confirm read status updates when portal user views messages

## Files Changed

**Database**:
- `packages/db/prisma/schema.prisma`: Added CustomerMessage model and Job relation

**Shared Types**:
- `packages/shared-types/src/index.ts`: Added CustomerMessageType, CustomerMessageChannel, CustomerMessageSource, CustomerMessageDTO, CreateCustomerMessageInput

**Backend**:
- `apps/core-api/src/modules/customer-experience/customer-experience.service.ts` (new)
- `apps/core-api/src/modules/customer-experience/customer-experience.controller.ts` (new)
- `apps/core-api/src/modules/customer-experience/customer-experience.module.ts` (new)
- `apps/core-api/src/app.module.ts`: Registered CustomerExperienceModule
- `apps/core-api/src/modules/customer-portal/customer-portal.module.ts`: Imported CustomerExperienceModule
- `apps/core-api/src/modules/customer-portal/customer-portal.controller.ts`: Added portal message endpoints

**Frontend**:
- `apps/customer-portal/src/lib/api.ts`: Added fetchJobMessages() and markMessagesRead()
- `apps/customer-portal/src/app/jobs/[jobId]/page.tsx`: Added Messages tab and MessagesTab component

**Tests**:
- `apps/core-api/src/modules/customer-experience/__tests__/customer-experience.service.spec.ts` (new)

## Dependencies

- Existing AiOperationsService for AI message generation
- Prisma for data persistence
- NestJS guards for API authentication (InternalApiKeyGuard, session-based portal auth)

## Configuration

No new environment variables required. Uses existing:
- `INTERNAL_API_KEY` for internal API access
- Database connection for Prisma
- OpenAI API key (already configured for AiOperationsService)

## Deployment Notes

- Run `pnpm db:generate` after pulling schema changes to regenerate Prisma client
- Run `pnpm db:push` or `pnpm db:migrate` to apply schema to database
- No breaking changes to existing APIs or features
- Fully backwards compatible with existing job and portal flows
