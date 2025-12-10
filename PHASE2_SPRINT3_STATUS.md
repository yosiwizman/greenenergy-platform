# Phase 2 Sprint 3: Warranty System - Implementation Status

## ✅ COMPLETED (Backend - All APIs functional)

### 1. Database Schema
- ✅ Updated `Warranty` model with comprehensive fields
- ✅ Added `WarrantyClaim` model with full tracking
- ✅ Prisma client generated successfully

### 2. Shared Types
- ✅ `WarrantyDTO`, `WarrantyClaimDTO`, `WarrantySummaryDTO`
- ✅ `WarrantyStatus`, `WarrantyClaimStatus`, `WarrantyClaimPriority` types
- ✅ `PortalJobView` extended with warranty field

### 3. Backend Implementation
- ✅ `warranty.service.ts` - Complete with all methods
- ✅ `warranty.controller.ts` - All REST endpoints implemented
- ✅ `warranty.module.ts` - Module wiring complete
- ✅ `warranty.tasks.ts` - Scheduler for expiring warranties (3 AM daily)
- ✅ Wired into AppModule
- ✅ Portal warranty claim endpoint added to CustomerPortalController
- ✅ CustomerPortalService updated to include warranty in job view
- ✅ Backend builds successfully

### API Endpoints Created:
```
POST   /api/v1/warranty/jobs/:jobId/activate
GET    /api/v1/warranty/jobs/:jobId
GET    /api/v1/warranty
GET    /api/v1/warranty/summary
POST   /api/v1/warranty/claims
GET    /api/v1/warranty/claims
GET    /api/v1/warranty/claims/:id
PATCH  /api/v1/warranty/claims/:id/status
POST   /api/v1/portal/jobs/:jobId/warranty-claims
```

## ⏳ REMAINING WORK (Frontend + Tests + Docs)

### Frontend Priority 1: Customer Portal
**Location**: `apps/customer-portal`

#### Files to modify:
1. **Job Detail Page** - `src/app/jobs/[jobId]/page.tsx` (or wherever Documents tab is)
   - Add Warranty Card in Documents tab:
     - Show status badge, type, provider, start/end dates
     - Download button if `documentUrl` exists
     - Fallback message if no warranty
   
2. **Service Request Form** - Create modal or new route
   - Add "Request Service" button
   - Form fields: title (input), description (textarea)
   - POST to `/api/v1/portal/jobs/:jobId/warranty-claims?token=...`
   - Show loading/success/error states

### Frontend Priority 2: Internal Dashboard  
**Location**: `apps/internal-dashboard`

#### Files to create/modify:
1. **Sidebar Navigation** - `src/app/layout.tsx` or nav component
   - Add Warranty nav item → `/warranty`

2. **Warranty Overview Page** - `src/app/warranty/page.tsx`
   - Fetch from `/api/v1/warranty/summary` and `/api/v1/warranty`
   - Summary cards: Total, Active, Expiring Soon, Expired
   - Warranties table: Job #, Type, Provider, Status (badge), Dates, Actions
   - Claims section: Fetch `/api/v1/warranty/claims?status=OPEN`
   - Claims table: Reported At, Job #, Title, Status, Priority, Source

### Tests
**Location**: `apps/core-api/src/modules/warranty/__tests__/`

Create `warranty.service.spec.ts`:
```typescript
describe('WarrantyService', () => {
  // Test activateWarrantyForJob (create & update)
  // Test getWarrantySummary (counts)
  // Test createClaimInternal
  // Test updateClaimStatus (sets resolvedAt for RESOLVED)
  // Mock JobNimbus client
});
```

### Documentation

1. **`docs/08-warranty-system.md`** - Create comprehensive doc:
   - Overview
   - Data models (Warranty, WarrantyClaim)
   - Flows (activation, expiry notifications, portal claims)
   - API endpoints
   - JobNimbus integration

2. **`docs/03-phase-2-roadmap.md`** - Update:
   - Mark Sprint 3 as COMPLETE
   - Add summary of deliverables

3. **`README.md`** - Update:
   - Add Warranty System section
   - List API endpoints
   - Document portal + dashboard features

## Quick Implementation Guide

### For Customer Portal:
```tsx
// In Documents tab
{job.warranty ? (
  <Card>
    <h3>Warranty Information</h3>
    <Badge>{job.warranty.status}</Badge>
    <p>Type: {job.warranty.type}</p>
    <p>Provider: {job.warranty.provider}</p>
    <p>Valid: {formatDate(job.warranty.startDate)} - {formatDate(job.warranty.endDate)}</p>
    {job.warranty.documentUrl && (
      <Button href={job.warranty.documentUrl} target="_blank">
        Download Warranty
      </Button>
    )}
  </Card>
) : (
  <p>Warranty information will appear here after your project is completed.</p>
)}

// Service Request Button
<Button onClick={() => setShowClaimModal(true)}>
  Request Service
</Button>

// In modal/form
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await fetch(`/api/v1/portal/jobs/${jobId}/warranty-claims?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  // Handle response
};
```

### For Internal Dashboard:
```tsx
// app/warranty/page.tsx
export default async function WarrantyPage() {
  const summary = await fetch('/api/v1/warranty/summary');
  const warranties = await fetch('/api/v1/warranty');
  const claims = await fetch('/api/v1/warranty/claims?status=OPEN');
  
  return (
    <div>
      <h1>Warranty Overview</h1>
      {/* Summary cards */}
      {/* Warranties table */}
      {/* Recent claims table */}
    </div>
  );
}
```

## Testing Locally

```bash
# Build everything
pnpm build

# Run backend
cd apps/core-api
pnpm start:dev

# Test API endpoints
curl http://localhost:3000/api/v1/warranty/summary

# Run tests
pnpm test
```

## Migration Note

Before deploying, run Prisma migration:
```bash
cd packages/db
pnpm prisma migrate dev --name add_warranty_claim_system
```

## Environment Variables

Add to `.env`:
```
WARRANTY_EXPIRY_NOTICE_DAYS=30
```
