# Safety & Incident Reporting System

## Overview

The Safety & Incident Reporting System (Phase 2 Sprint 2) provides comprehensive safety management capabilities including incident tracking, safety checklists, OSHA compliance reporting, and integrated risk assessment.

**Key Features:**
- Incident reporting (injury, property damage, near misses, violations, crew issues)
- Safety checklists (toolbox talks, PPE, ladder, fall protection, heat exposure, electrical)
- Automated JobNimbus integration for incident notifications
- OSHA 300/300A-style summaries
- Integration with Risk Dashboard and Subcontractor Performance
- Location tracking (GPS coordinates) for incidents

## Data Models

### SafetyIncident
Core incident tracking entity:

```prisma
model SafetyIncident {
  id              String   @id @default(cuid())
  jobId           String?
  subcontractorId String?
  
  type            String   // 'INJURY', 'PROPERTY_DAMAGE', 'NEAR_MISS', 'VIOLATION', 'CREW_ISSUE'
  severity        String   // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  description     String
  occurredAt      DateTime
  reportedAt      DateTime
  reportedBy      String?
  location        String?
  latitude        Float?
  longitude       Float?
  
  status          String   // 'OPEN', 'UNDER_REVIEW', 'CLOSED'
  lostTimeDays    Int?     // For OSHA
  medicalTreatmentRequired Boolean? // For OSHA
  
  photos          SafetyIncidentPhoto[]
}
```

### SafetyIncidentPhoto
Photo attachments for incidents:

```prisma
model SafetyIncidentPhoto {
  id              String   @id @default(cuid())
  incidentId      String
  url             String
  caption         String?
  uploadedAt      DateTime
}
```

### SafetyChecklist
Digital safety forms and checklists:

```prisma
model SafetyChecklist {
  id              String   @id @default(cuid())
  jobId           String?
  subcontractorId String?
  
  type            String   // 'TOOLBOX_TALK', 'PPE', 'LADDER', 'FALL_PROTECTION', 'HEAT_EXPOSURE', 'ELECTRICAL'
  date            DateTime
  completedBy     String?
  notes           String?
  itemsJson       Json     // Checklist item results
}
```

## Incident Types

### INJURY
Work-related injuries requiring medical attention or resulting in lost work time.

**Examples:** Falls, cuts, burns, struck-by incidents

### PROPERTY_DAMAGE
Damage to customer property, company equipment, or third-party property.

**Examples:** Broken windows, damaged roofing, vehicle accidents

### NEAR_MISS
Incidents that could have resulted in injury or damage but didn't.

**Examples:** Tools falling near workers, close calls with power lines

### VIOLATION
Safety protocol violations or non-compliance with regulations.

**Examples:** Working without required PPE, ignoring safety procedures

### CREW_ISSUE
Crew-related safety concerns not covered by other types.

**Examples:** Inadequate training, communication breakdowns

## Severity Levels

### LOW
- Minor incidents with no lasting impact
- No medical treatment required
- Minimal property damage (<$500)

### MEDIUM
- Incidents requiring first aid or minor medical attention
- Property damage ($500-$5,000)
- Potential for escalation if repeated

### HIGH
- Serious incidents requiring professional medical treatment
- Significant property damage ($5,000-$25,000)
- Lost work time (1-7 days)

### CRITICAL
- Life-threatening or disabling injuries
- Major property damage (>$25,000)
- Extended lost work time (>7 days)
- Fatalities

## Incident Lifecycle

### 1. OPEN
Initial state when incident is reported.
- Requires immediate review
- Triggers JobNimbus notifications for MEDIUM+ severity
- Adds to risk assessment for the job

### 2. UNDER_REVIEW
Incident is being investigated.
- Management reviewing details
- Corrective actions being determined
- Still contributes to risk scoring

### 3. CLOSED
Incident resolved and corrective actions completed.
- No longer affects current risk scoring
- Retained for OSHA reporting and historical analysis
- Still affects subcontractor performance scoring

## JobNimbus Integration

When an incident is created with **MEDIUM, HIGH, or CRITICAL** severity and linked to a job:

### Note Creation
Creates a note in JobNimbus on the job record:
```
⚠️ SAFETY INCIDENT: [TYPE] – Severity [SEVERITY]. [Description (first 100 chars)]...
```

### Task Creation (HIGH/CRITICAL only)
Creates a task for HIGH or CRITICAL incidents:
- **Title:** "Review [severity] safety incident: [TYPE]"
- **Due Date:** Next day
- **Assigned:** Based on job assignment

### Error Handling
- JobNimbus failures are logged but don't block incident creation
- Missing `jobNimbusId` on job will skip notification
- Unconfigured credentials will disable integration

## Risk Dashboard Integration

Safety incidents contribute to job risk assessment:

### Risk Rule: SAFETY_INCIDENT

**Triggers:**
- Any OPEN or UNDER_REVIEW incidents on the job

**Severity Mapping:**
- **HIGH Risk:** Job has CRITICAL or HIGH severity incidents
- **MEDIUM Risk:** Job has MEDIUM severity incidents
- **LOW Risk:** No open incidents

**Example Risk Reason:**
```json
{
  "code": "SAFETY_INCIDENT",
  "label": "Open safety incidents",
  "description": "Job has 1 critical and 2 high-severity open safety incidents",
  "severity": "HIGH"
}
```

## Subcontractor Performance Integration

Safety incidents linked to subcontractors impact performance scoring:

### Performance Deductions
- **Per incident:** -10 points (regardless of severity)
- Applied to all incidents (open, under review, or closed)
- Contributes to overall score (0-100 scale)

### Status Impact
- Multiple safety incidents can drop status from GREEN to YELLOW or RED
- Threshold: <85 = YELLOW, <70 = RED

### Example
- Starting score: 100
- 3 safety incidents: -30 points
- 2 QC failures: -10 points
- **Final score:** 60 (RED status)

## OSHA Compliance

### OSHA Recordable Incidents
An incident is OSHA recordable if:
- Medical treatment required (`medicalTreatmentRequired` = true), **OR**
- Lost work time (`lostTimeDays` > 0)

### OSHA Summary Reports

**Endpoint:** `GET /api/v1/safety/osha-summary?year=2024`

**Returns:**
```json
{
  "year": 2024,
  "totalRecordableIncidents": 15,
  "daysAwayFromWork": 45,
  "restrictedOrTransferCases": 5,
  "otherRecordableCases": 10,
  "byIncidentType": {
    "INJURY": 12,
    "PROPERTY_DAMAGE": 2,
    "NEAR_MISS": 0,
    "VIOLATION": 1,
    "CREW_ISSUE": 0
  }
}
```

**Note:** This provides data-ready summaries for OSHA 300/300A forms but does not generate actual PDF forms. Use this data to populate official OSHA forms manually or with third-party tools.

## Safety Checklists

### Checklist Types

**TOOLBOX_TALK:** Daily safety meetings
- Hazard review
- Work plan discussion
- Emergency procedures

**PPE:** Personal Protective Equipment verification
- Hard hats
- Safety glasses
- Harnesses
- Gloves
- Footwear

**LADDER:** Ladder safety inspection
- Condition check
- Proper setup
- 3-point contact
- Weight limits

**FALL_PROTECTION:** Fall protection system check
- Anchor points
- Harness fit
- Lanyard condition
- Guardrails

**HEAT_EXPOSURE:** Heat stress prevention
- Hydration
- Shade breaks
- Work/rest cycles

**ELECTRICAL:** Electrical safety
- Lockout/tagout
- Arc flash protection
- Proper tools

### Checklist Item Results
Each item can be marked as:
- **OK:** Compliant/acceptable
- **ISSUE:** Non-compliant/needs attention
- **NA:** Not applicable

## API Endpoints

### Incidents

```
POST   /api/v1/safety/incidents
  Create a new safety incident
  Body: CreateSafetyIncidentDto

GET    /api/v1/safety/incidents
  List incidents with filters
  Query: jobId, subcontractorId, severity, status, fromDate, toDate

GET    /api/v1/safety/incidents/:id
  Get single incident

PATCH  /api/v1/safety/incidents/:id/status
  Update incident status
  Body: { status: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED' }

GET    /api/v1/safety/incidents-summary
  Get summary statistics
  Query: fromDate, toDate
  Returns: SafetyIncidentSummaryDTO

GET    /api/v1/safety/osha-summary
  Get OSHA summary for a year
  Query: year (integer)
  Returns: OshalogSummaryDTO
```

### Checklists

```
POST   /api/v1/safety/checklists
  Create a new checklist
  Body: CreateSafetyChecklistDto

GET    /api/v1/safety/checklists
  List checklists with filters
  Query: jobId, subcontractorId, type, fromDate, toDate
```

## UI Routes (To Be Implemented)

### Internal Dashboard
- `/safety` - Overview with summary cards and incident table
- `/safety/incidents/[id]` - Incident detail page

**Features:**
- Filter by severity, status, subcontractor
- View incident photos
- Change incident status
- Link to related jobs and subcontractors
- Link to JobNimbus records

## Security & Configuration

### Environment Variables

```env
JOBNIMBUS_BASE_URL=https://api.jobnimbus.com
JOBNIMBUS_API_KEY=your-api-key-here
```

### Data Privacy
- GPS coordinates are optional
- Personally identifiable information in descriptions should follow company policies
- Incident photos may contain sensitive information - restrict access accordingly

## Troubleshooting

### Incident Not Creating JobNimbus Note
- Check that job has `jobNimbusId` populated
- Verify `JOBNIMBUS_API_KEY` is configured
- Ensure incident severity is MEDIUM or higher
- Check logs for API errors

### Risk Not Showing Safety Incidents
- Verify incident status is OPEN or UNDER_REVIEW
- Ensure incident is linked to job (`jobId` is set)
- Run `POST /api/v1/risk/jobs/:jobId/evaluate` to refresh risk

### Subcontractor Performance Not Reflecting Safety
- Verify incidents are linked to subcontractor (`subcontractorId` is set)
- Run `POST /api/v1/subcontractors/:id/performance/evaluate` to refresh
- Check that incidents exist in database

### OSHA Summary Missing Incidents
- Verify incidents have `occurredAt` dates in the requested year
- Ensure `medicalTreatmentRequired` or `lostTimeDays` is set for recordable incidents
- Check that year parameter is correct integer

## Future Enhancements (Phase 2+)

1. **Mobile App Integration:**
   - Field incident reporting with camera
   - GPS auto-capture
   - Offline support

2. **Analytics:**
   - Trend analysis
   - Leading vs. lagging indicators
   - Safety KPIs dashboard

3. **Training Integration:**
   - Link training records to incidents
   - Required training enforcement
   - Certification tracking

4. **Automated OSHA Forms:**
   - PDF generation for 300/300A
   - Electronic submission
   - Multi-establishment support

5. **Predictive Safety:**
   - ML models for incident prediction
   - Proactive risk mitigation
   - Heat map of high-risk jobs/locations
