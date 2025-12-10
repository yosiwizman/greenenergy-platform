# Material & Scheduling System (Phase 2 Sprint 4)

## Overview

The Material & Scheduling system provides predictive scheduling capabilities by tracking material order ETAs and combining them with existing risk and subcontractor data to identify potential scheduling conflicts early.

## Features

### Material ETA Tracking
- Track material orders for each job with supplier, delivery dates, and status
- Compute real-time ETA status (ON_TRACK, AT_RISK, LATE)
- Summary dashboard showing order counts and delivery risk

### Predictive Scheduling
- Combine material ETA, job risk levels, and subcontractor performance
- Compute scheduling risk level (LOW, MEDIUM, HIGH) for each job
- Provide actionable reasons for scheduling concerns

## Data Model

### MaterialOrder
```prisma
model MaterialOrder {
  id                   String    @id @default(cuid())
  jobId                String
  supplierName         String
  orderNumber          String?
  materialName         String
  quantity             Float?
  unit                 String?
  status               String    // PENDING, ORDERED, SHIPPED, DELIVERED, DELAYED, CANCELLED
  orderedAt            DateTime?
  expectedDeliveryDate DateTime?
  actualDeliveryDate   DateTime?
  trackingUrl          String?
  notes                String?
  job                  Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  @@index([jobId])
  @@index([status])
  @@index([expectedDeliveryDate])
}
```

## ETA Status Logic

### MaterialEtaStatus Computation
The system computes one of three statuses for each material order:

1. **ON_TRACK**: Order is delivered OR expected delivery is >3 days away
2. **AT_RISK**: Expected delivery within 3 days OR no delivery date set
3. **LATE**: Expected delivery date passed and order not delivered

Configuration: `ETA_AT_RISK_THRESHOLD_DAYS` (default: 3 days)

## Scheduling Risk Logic

### SchedulingRiskLevel Computation
For each job, the system evaluates multiple factors and upgrades risk level accordingly:

**Starting Point**: LOW risk

**Upgrade to HIGH if**:
- Any material order has etaStatus === 'LATE'
- Job risk snapshot riskLevel === 'HIGH'
- Primary subcontractor performanceStatus === 'RED'

**Upgrade to MEDIUM if**:
- Any material order has etaStatus === 'AT_RISK'
- Job risk snapshot riskLevel === 'MEDIUM'
- Primary subcontractor performanceStatus === 'YELLOW'

The system returns the **highest** risk level encountered along with all relevant reasons.

## API Endpoints

### Material Orders

#### Create Material Order
```
POST /api/v1/material-orders/jobs/:jobId
Body: {
  supplierName: string
  materialName: string
  quantity?: number
  unit?: string
  orderNumber?: string
  expectedDeliveryDate?: string (ISO)
  trackingUrl?: string
  notes?: string
}
Response: MaterialOrderDTO
```

#### Update Material Order
```
PATCH /api/v1/material-orders/:id
Body: {
  status?: MaterialOrderStatus
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  trackingUrl?: string
  notes?: string
  ...
}
Response: MaterialOrderDTO
```

#### List Material Orders
```
GET /api/v1/material-orders?jobId=:jobId&status=:status
Response: MaterialOrderDTO[]
```

#### Get Orders for Job
```
GET /api/v1/material-orders/jobs/:jobId
Response: MaterialOrderDTO[]
```

#### Get Material Summary
```
GET /api/v1/material-orders/summary
Response: MaterialSummaryDTO {
  totalOrders: number
  openOrders: number
  delayedOrders: number
  deliveredOrders: number
}
```

### Scheduling

#### Get Scheduling Overview
```
GET /api/v1/scheduling/overview
Response: SchedulingRiskDTO[] (all active jobs)
```

#### Get Scheduling for Job
```
GET /api/v1/scheduling/jobs/:jobId
Response: SchedulingRiskDTO | null
```

## Internal Dashboard Pages

### /materials
- Summary cards: Total, Open, Delayed, Delivered orders
- Filters: Status, Supplier name
- Table showing all orders with ETA status badges
- Links to job risk pages

### /schedule
- Summary cards: Low, Medium, High risk job counts
- Table showing all active jobs with:
  - Material ETA status
  - Subcontractor status
  - Scheduling risk level
  - Top reasons for risk
- Links to job risk pages

## Integration Points

### JobNimbus (Future)
- TODO: Write back notes when material status changes to DELAYED
- TODO: Fetch material orders from JobNimbus if available

### External Supplier APIs (Future)
- Integration with Beacon, ABC Supply, etc. for real-time tracking
- Automatic status updates based on tracking numbers

### Weather APIs (Future)
- Adjust scheduling risk based on weather forecasts
- Recommend alternate scheduling windows

## Usage Examples

### Create a material order
```typescript
const order = await materialService.createOrder('job-123', {
  supplierName: 'ABC Supply',
  materialName: 'Shingles - GAF Timberline HDZ',
  quantity: 25,
  unit: 'SQ',
  expectedDeliveryDate: '2025-12-20',
});
// Returns MaterialOrderDTO with computed etaStatus
```

### Get scheduling overview
```typescript
const risks = await schedulingService.getSchedulingOverview();
// Returns array of SchedulingRiskDTO with computed schedulingRiskLevel and reasons
```

## Future Enhancements

1. **Crew Capacity Modeling**: Factor in available crew capacity
2. **Weather Integration**: Adjust scheduling based on forecasts
3. **Supplier API Integration**: Real-time tracking from supplier systems
4. **ML-based ETA Prediction**: Learn from historical data
5. **Automated Rescheduling**: Suggest optimal reschedule dates
6. **SMS/Email Alerts**: Notify stakeholders of scheduling risks
