# Warranty System

## Overview

The Warranty System (Phase 2 Sprint 3) provides comprehensive warranty management and claim tracking for completed solar installations. The system handles warranty activation, expiry monitoring, customer service requests, and claim management with full JobNimbus integration.

**Key Features:**
- Warranty activation upon job completion
- Automated expiry tracking with scheduled notifications
- Customer portal for warranty information and service requests
- Internal claim management system
- Integrated JobNimbus notifications for activations, claims, and expiry warnings
- Support for multiple warranty types and providers

## Data Models

### Warranty

Core warranty tracking entity:

```prisma
model Warranty {
  id              String    @id @default(cuid())
  jobId           String    @unique
  warrantyNumber  String?
  type            String    // e.g., "Solar Panel Warranty", "Inverter Warranty"
  provider        String?   // Warranty provider/manufacturer
  startDate       DateTime  // Usually job completion date
  endDate         DateTime  // Calculated from startDate + termMonths
  status          String    // PENDING_ACTIVATION | ACTIVE | EXPIRED | CANCELLED
  coverageJson    Json?     // Flexible coverage details storage
  documentUrl     String?   // Link to warranty document PDF
  activatedAt     DateTime?
  
  job             Job       @relation(fields: [jobId], references: [id])
  claims          WarrantyClaim[]
}
```

### WarrantyClaim

Warranty claim and service request tracking:

```prisma
model WarrantyClaim {
  id              String    @id @default(cuid())
  jobId           String
  warrantyId      String?   // Optional link to specific warranty
  
  // Customer information (for portal claims)
  customerName    String?
  customerEmail   String?
  customerPhone   String?
  
  source          String    // PORTAL | INTERNAL
  status          String    // OPEN | IN_REVIEW | APPROVED | REJECTED | RESOLVED
  priority        String    // LOW | MEDIUM | HIGH
  
  title           String
  description     String
  reportedAt      DateTime
  resolvedAt      DateTime?
  
  internalNotes   String?
  metadataJson    Json?     // Additional claim metadata
  
  job             Job       @relation(fields: [jobId], references: [id])
  warranty        Warranty? @relation(fields: [warrantyId], references: [id])
}
```

## Warranty Status

### PENDING_ACTIVATION
Initial state when warranty is created but not yet active.
- Typically set during job completion workflow
- Awaiting final activation/documentation
- Not yet providing coverage

### ACTIVE
Warranty is currently active and providing coverage.
- Standard operational state
- Eligible for claim submissions
- Monitored for expiry

### EXPIRED
Warranty term has ended.
- No longer providing coverage
- Historical record maintained
- Appears in reports but not active list

### CANCELLED
Warranty was cancelled before term completion.
- Rare case for refunds, job cancellations, or policy changes
- Historical record maintained

## Claim Status

### OPEN
Initial state when claim is submitted.
- Requires initial review
- Triggers JobNimbus notification
- Awaiting assignment

### IN_REVIEW
Claim is being investigated by internal team.
- May involve site visits, diagnostics, or documentation review
- Active work in progress

### APPROVED
Claim has been approved for service/repair.
- Work can proceed
- May trigger scheduling or dispatch

### REJECTED
Claim does not qualify under warranty terms.
- Requires communication with customer
- Decision documented in claim notes

### RESOLVED
Claim has been completed.
- Service performed or issue resolved
- Sets `resolvedAt` timestamp automatically
- Final state for closed claims

## Claim Priority

### LOW
Non-urgent issues that don't affect system operation.
- Cosmetic issues
- Information requests
- Minor concerns

### MEDIUM
Issues affecting partial system operation or requiring attention.
- Reduced power output
- Non-critical component failures
- Default priority for portal submissions

### HIGH
Urgent issues requiring immediate attention.
- System completely down
- Safety concerns
- Critical component failures

## Warranty Lifecycle

### 1. Activation
**Trigger:** Job completion or manual activation via internal API

**Process:**
1. Call `POST /api/v1/warranty/jobs/:jobId/activate`
2. System creates warranty record with:
   - `startDate`: Job completion date (or manual override)
   - `endDate`: Calculated from `startDate + termMonths`
   - `status`: `ACTIVE`
   - `warrantyNumber`: Auto-generated unique identifier
3. JobNimbus integration creates note on job record
4. If warranty document URL provided, accessible via portal

**Default Terms:**
- Standard warranty term: 120 months (10 years)
- Configurable via `WARRANTY_DEFAULT_TERM_MONTHS` env var
- Can be overridden per activation

### 2. Active Monitoring
**Daily Scheduled Task (runs at 3 AM):**
1. Identifies warranties expiring within threshold (default 30 days)
2. For each expiring warranty:
   - Creates JobNimbus note: "Warranty expiring soon"
   - Creates JobNimbus task: "Review warranty renewal options"
   - Status remains `ACTIVE` until actual expiry date

**Configuration:**
- `WARRANTY_EXPIRY_NOTICE_DAYS`: Days before expiry to trigger notifications (default: 30)

### 3. Expiration
**Automatic Status Update:**
- When current date >= `endDate`, status changes to `EXPIRED`
- No longer appears in active warranty list
- Historical record retained for reporting
- Claims can no longer be submitted against expired warranties

## Customer Portal Integration

### Warranty Display
**Location:** Job detail page → Documents tab

**Behavior:**
- If `warranty` exists on job:
  - Shows warranty card with status badge (colored by status)
  - Displays type, provider, start date, end date
  - Shows coverage summary if available
  - Download button for warranty document if URL exists
- If no warranty exists:
  - Shows placeholder: "Warranty information will appear here after your project is completed."

### Service Request Form
**Location:** Job detail page → Documents tab (below warranty card)

**Form Fields:**
- **Title** (required): Short summary of issue
- **Description** (required): Detailed description of problem

**Submission:**
- `POST /api/v1/portal/jobs/:jobId/warranty-claims?token={portalToken}`
- Creates claim with:
  - `source`: `PORTAL`
  - `status`: `OPEN`
  - `priority`: `MEDIUM` (default)
  - Customer name/email from portal session
- Success message: "Your request has been received. Our team will review it and follow up."
- Form clears on success

**Future Enhancement:**
- TODO: Add photo/file upload capability for claims (referenced in code comments)

## Internal Dashboard

### Warranty Overview Page
**Route:** `/warranty`

**Summary Cards:**
- Total Warranties
- Active Warranties (count)
- Expiring Soon (within 30 days)
- Expired Warranties

**Warranties Table:**
- Columns: Job ID, Type, Provider, Status (badge), Start Date, End Date, Actions
- Status filter dropdown: All | Active | Pending | Expired | Cancelled
- Client-side filtering for responsive UX
- "View Job" action links to job detail page

**Recent Claims Section:**
- Displays open warranty claims
- Columns: Reported At, Job ID, Title, Status, Priority, Source (Portal/Internal)
- Empty state: "No open warranty claims."

## JobNimbus Integration

### Warranty Activation
When a warranty is activated:

**Note Created:**
```
🛡️ WARRANTY ACTIVATED: [Type] – Provider: [Provider]. Term: [termMonths] months.
Valid from [startDate] to [endDate]. Warranty #: [warrantyNumber]
```

**Behavior:**
- Always creates note on job record
- Only if `jobNimbusId` exists on job
- Failures logged but don't block warranty creation

### Claim Creation
When a warranty claim is submitted (portal or internal):

**Note Created:**
```
⚠️ WARRANTY CLAIM: [title]
Source: [PORTAL/INTERNAL], Priority: [priority]
Description: [first 200 chars]...
```

**Behavior:**
- Creates note immediately
- For HIGH priority claims, may create task (future enhancement)
- Portal claims include customer contact info in note

### Expiry Warnings
When warranties are expiring soon (scheduled job):

**Note Created:**
```
⏰ WARRANTY EXPIRING SOON: [Type] expires on [endDate] ([X] days from now)
```

**Task Created:**
```
Title: Review warranty renewal options for [customerName]
Due Date: [Current date + 7 days]
```

**Behavior:**
- Runs daily at 3 AM
- Processes warranties expiring within threshold (default 30 days)
- Only creates notifications once per warranty
- Does not repeat for same warranty

## API Endpoints

### Internal Warranty API

#### Activation
```
POST /api/v1/warranty/jobs/:jobId/activate
Body: {
  type: string,
  provider?: string,
  termMonths?: number,  // Defaults to 120
  coverageDetails?: object,
  documentUrl?: string
}
```

#### Retrieve Warranty
```
GET /api/v1/warranty/jobs/:jobId
Response: WarrantyDTO | null
```

#### List Warranties
```
GET /api/v1/warranty?status=ACTIVE&fromEndDate=2024-01-01&toEndDate=2024-12-31
Response: WarrantyDTO[]
```

#### Summary
```
GET /api/v1/warranty/summary
Response: {
  total: number,
  active: number,
  expiringSoon: number,
  expired: number
}
```

#### Create Internal Claim
```
POST /api/v1/warranty/claims
Body: {
  jobId: string,
  warrantyId?: string,
  title: string,
  description: string,
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}
```

#### List Claims
```
GET /api/v1/warranty/claims?status=OPEN&jobId=xxx
Response: WarrantyClaimDTO[]
```

#### Get Claim
```
GET /api/v1/warranty/claims/:id
Response: WarrantyClaimDTO
```

#### Update Claim Status
```
PATCH /api/v1/warranty/claims/:id/status
Body: { status: 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED' }
```

### Customer Portal API

#### Submit Warranty Claim
```
POST /api/v1/portal/jobs/:jobId/warranty-claims?token={portalToken}
Body: {
  title: string,
  description: string
}
```

Portal session validation applied automatically. Customer info extracted from session.

## Environment Configuration

```env
# Warranty System
WARRANTY_DEFAULT_TERM_MONTHS=120          # Default warranty duration (10 years)
WARRANTY_EXPIRY_NOTICE_DAYS=30            # Days before expiry to send notifications
```

## Best Practices

### Warranty Activation
- Activate warranties immediately after job completion
- Always provide warranty document URL when available
- Include detailed coverage information in `coverageDetails`
- Use consistent warranty type naming conventions

### Claim Management
- Review portal claims within 24 hours
- Use priority levels appropriately to ensure urgent issues are addressed
- Document resolution details in internal notes
- Always set status to `RESOLVED` when work is complete

### Customer Communication
- Respond to portal claims via JobNimbus or direct outreach
- Keep customers informed of claim status changes
- Provide clear explanations for rejected claims
- Proactively communicate warranty expiry dates

### Reporting
- Monitor "Expiring Soon" count regularly
- Track claim resolution times by priority level
- Identify common warranty issues for quality improvements
- Review expired warranties for renewal opportunities

## Testing

Unit tests provided in `apps/core-api/src/modules/warranty/__tests__/warranty.service.spec.ts` cover:
- Warranty activation (new and existing)
- End date calculation from term months
- Summary statistics computation
- Internal and portal claim creation
- Status updates with automatic `resolvedAt` setting

Run tests: `pnpm test`

## Future Enhancements

**Planned (Future Sprints):**
- Photo/file upload for warranty claims
- Email notifications to customers on claim status changes
- Warranty renewal workflow
- Advanced claim assignment and routing
- Warranty claim analytics dashboard
- Integration with parts/inventory system for warranty repairs
- Multi-warranty support per job (separate panel, inverter, battery warranties)
