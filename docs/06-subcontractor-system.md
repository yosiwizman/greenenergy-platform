# Subcontractor Management System

## Overview

The Subcontractor Management System (Phase 2 Sprint 1) provides comprehensive management of subcontractor directory, compliance tracking, performance scoring, and job assignment with automated JobNimbus integration.

**Key Features:**
- Subcontractor directory with contact and licensing information
- Automated compliance monitoring (license, insurance, W9, COI)
- Performance scoring (0-100) based on operational metrics
- Job assignment with compliance guard
- JobNimbus integration for non-compliance alerts
- Real-time risk assessment

## Data Models

### Subcontractor
Core subcontractor entity with compliance and performance fields:

```prisma
model Subcontractor {
  id                      String
  name                    String
  legalName               String?
  primaryContact          String?
  email                   String?
  phone                   String?
  crewSize                Int?
  
  // Compliance fields
  licenseNumber           String?
  licenseExpiresAt        DateTime?
  insurancePolicyNumber   String?
  insuranceExpiresAt      DateTime?
  w9Received              Boolean
  coiReceived             Boolean
  lastComplianceStatus    String?  // 'COMPLIANT' | 'NON_COMPLIANT'
  
  // Performance fields
  performanceScore        Int?      // 0-100
  performanceStatus       String?   // 'GREEN' | 'YELLOW' | 'RED'
  lastEvaluatedAt         DateTime?
  
  isActive                Boolean
}
```

### SubcontractorDocument
Document tracking for compliance verification:

```prisma
model SubcontractorDocument {
  id              String
  subcontractorId String
  type            String  // 'LICENSE', 'INSURANCE', 'W9', 'COI', 'OTHER'
  name            String
  url             String
  uploadedAt      DateTime
  expiresAt       DateTime?
}
```

### JobSubcontractorAssignment
Links subcontractors to jobs:

```prisma
model JobSubcontractorAssignment {
  id              String
  jobId           String
  subcontractorId String
  role            String?   // e.g. 'ROOF_INSTALL', 'ELECTRICAL'
  assignedAt      DateTime
  unassignedAt    DateTime?
  isPrimary       Boolean   // One primary sub per job
}
```

## Compliance Rules

The system automatically evaluates compliance based on four criteria:

### 1. License Validation
- **Valid**: `licenseNumber` present AND `licenseExpiresAt` is in the future
- **Invalid**: Missing license number OR expired date
- **Missing Items**: `LICENSE_MISSING` or `LICENSE_EXPIRED`

### 2. Insurance Validation
- **Valid**: `insurancePolicyNumber` present AND `insuranceExpiresAt` is in the future
- **Invalid**: Missing policy number OR expired date
- **Missing Items**: `INSURANCE_MISSING` or `INSURANCE_EXPIRED`

### 3. W9 Document
- **Valid**: `w9Received` === `true`
- **Invalid**: `w9Received` === `false`
- **Missing Items**: `W9_MISSING`

### 4. COI (Certificate of Insurance)
- **Valid**: `coiReceived` === `true`
- **Invalid**: `coiReceived` === `false`
- **Missing Items**: `COI_MISSING`

### Overall Compliance
A subcontractor is **compliant** only if ALL four criteria are met:
- Valid license
- Valid insurance
- W9 received
- COI received

### State Tracking
The system tracks compliance state transitions:
1. When compliance is evaluated, `lastComplianceStatus` is updated
2. If status changes from `COMPLIANT` → `NON_COMPLIANT`, JobNimbus integration triggers

## Performance Scoring

### Scoring Algorithm
The performance scoring engine uses a transparent, rules-based approach:

**Starting Point**: 100 points

**Deductions**:
- QC failures: **-5 points** each
- Safety incidents: **-10 points** each
- Inspection failures: **-8 points** each (future)
- Delay incidents: **-3 points** each (future)
- Customer complaints: **-4 points** each (future)

**Score Range**: Clamped between 0 and 100

### Status Mapping
```
score >= 85  → GREEN   (Excellent performance)
70 <= score < 85 → YELLOW  (Needs improvement)
score < 70   → RED     (Critical issues)
```

### Data Sources
- **QC failures**: Count of `QCPhotoCheck` records with `status = 'FAIL'` for jobs assigned to the subcontractor
- **Safety incidents**: Count of `SafetyIncident` records linked to the subcontractor
- **Future metrics**: Inspection failures, delays, complaints (placeholders for Phase 2 Sprint 2+)

### Evaluation Frequency
- Manual: Via API endpoint `POST /api/v1/subcontractors/:id/performance/evaluate`
- Bulk: Via protected endpoint `POST /api/v1/subcontractors/performance/evaluate-all`
- On-demand: Dashboard "Re-evaluate" button

## Integration Points

### Job Assignment with Compliance Guard
When assigning a subcontractor to a job:

1. System verifies subcontractor exists and is active
2. System evaluates current compliance status
3. **If non-compliant**: Assignment blocked with `ConflictException`
4. **If compliant**: Assignment proceeds

**Endpoint**: `POST /api/v1/jobs/:jobId/subcontractors`

**Error Response** (non-compliant):
```json
{
  "statusCode": 409,
  "message": "Subcontractor ACME Roofing is non-compliant and cannot be assigned. Missing: LICENSE_EXPIRED, W9_MISSING"
}
```

### JobNimbus Integration

When a subcontractor transitions from compliant to non-compliant:

1. **Find affected jobs**: Query all active jobs assigned to the subcontractor
2. **For each job**:
   - Create a **note** in JobNimbus:
     ```
     ⚠️ SUBCONTRACTOR NON-COMPLIANT: [Name]. 
     Missing/expired: [items]. 
     Please review before scheduling.
     ```
   - Create a **task** in JobNimbus:
     - Title: `Resolve subcontractor compliance: [Name]`
     - Description: Details of missing items
     - Due date: Tomorrow

3. **Error handling**: Failures logged but don't block compliance evaluation

**Requirements**:
- Job must have `jobNimbusId` set
- JobNimbus API credentials configured

### Risk Dashboard Integration
Subcontractor performance status can be surfaced in risk views:

- Risk snapshot DTOs can include `subcontractorPerformanceStatus`
- Risk detail pages can show primary subcontractor info
- Risk overview tables can display subcontractor status column

**Future Enhancement**: Add risk rule for `POOR_SUBCONTRACTOR_PERFORMANCE`

## API Endpoints

### Subcontractor CRUD
```
GET    /api/v1/subcontractors              List all subcontractors (with filters)
GET    /api/v1/subcontractors/:id          Get single subcontractor
POST   /api/v1/subcontractors              Create subcontractor
PATCH  /api/v1/subcontractors/:id          Update subcontractor
POST   /api/v1/subcontractors/:id/deactivate  Deactivate subcontractor
```

**Query Filters**:
- `isActive=true|false`
- `isCompliant=true|false`
- `performanceStatus=GREEN|YELLOW|RED`

### Compliance
```
GET  /api/v1/subcontractors/:id/compliance        Get compliance status
POST /api/v1/subcontractors/compliance/evaluate-all  Bulk compliance evaluation (protected)
```

### Performance
```
POST /api/v1/subcontractors/:id/performance/evaluate  Evaluate performance
GET  /api/v1/subcontractors/:id/performance          Get latest performance
POST /api/v1/subcontractors/performance/evaluate-all Bulk performance evaluation (protected)
```

### Job Assignment
```
GET  /api/v1/jobs/:jobId/subcontractors                 List subcontractors on job
POST /api/v1/jobs/:jobId/subcontractors                 Assign subcontractor to job
POST /api/v1/jobs/subcontractor-assignments/:id/unassign  Unassign subcontractor
```

## UI Routes

### Internal Dashboard
- `/subcontractors` - List view with filters
- `/subcontractors/[id]` - Detail view with compliance, performance, and jobs

### Features
- **List page**: Filterable table showing compliance/performance status
- **Detail page**: 
  - Contact information
  - Compliance card with license/insurance/W9/COI status
  - Performance card with score breakdown
  - Assigned jobs list
  - Re-evaluate buttons

## Security

### Protected Endpoints
Bulk evaluation endpoints are protected with `InternalApiKeyGuard`:
- `POST /api/v1/subcontractors/compliance/evaluate-all`
- `POST /api/v1/subcontractors/performance/evaluate-all`

**Header Required**: `x-internal-api-key: ${INTERNAL_API_KEY}`

### Configuration
```env
INTERNAL_API_KEY=your-internal-api-key-here
JOBNIMBUS_BASE_URL=https://api.jobnimbus.com
JOBNIMBUS_API_KEY=your-jobnimbus-api-key
```

## Testing

Comprehensive test coverage for:
- **Compliance logic**: All scenarios (valid, expired, missing)
- **Performance scoring**: Score calculation and status mapping
- **Assignment guard**: Blocking non-compliant assignments

**Test file**: `apps/core-api/src/modules/subcontractor/subcontractor.service.spec.ts`

**Run tests**:
```bash
pnpm --filter @greenenergy/core-api test
```

## Future Enhancements (Phase 2+)

1. **Additional Performance Metrics**:
   - Inspection failure tracking
   - Delay incident tracking
   - Customer complaint integration

2. **Document Management**:
   - Full `SubcontractorDocument` CRUD
   - Automated expiration alerts
   - Document upload and storage

3. **Advanced Features**:
   - Subcontractor scorecards
   - Historical performance trends
   - Automated crew assignment optimization
   - Subcontractor portal (view assignments, update compliance docs)

4. **Risk Integration**:
   - New risk rule: `POOR_SUBCONTRACTOR_PERFORMANCE`
   - Automatic risk elevation for jobs with low-performing subs

## Troubleshooting

### Compliance Not Updating
- Check that dates are in ISO format
- Verify `lastComplianceStatus` field exists in database
- Check logs for evaluation errors

### JobNimbus Notifications Not Sending
- Verify `JOBNIMBUS_API_KEY` is set
- Check that job has `jobNimbusId` populated
- Review logs for API errors

### Performance Score Seems Wrong
- Verify job assignments are correct
- Check QC and safety incident counts in database
- Review performance factors in API response for breakdown

### Assignment Blocked Incorrectly
- Evaluate compliance manually: `GET /api/v1/subcontractors/:id/compliance`
- Check for recent license/insurance expiration
- Verify W9/COI flags are accurate
