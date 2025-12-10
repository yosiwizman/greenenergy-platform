# AI Operations Assistant (Phase 2 Sprint 5)

## Overview

The **AI Operations Assistant** provides intelligent, AI-powered operational insights for solar installation projects. This system generates job summaries, actionable recommendations, and customer-facing message drafts using deterministic rule-based logic. While v1 uses templates and rules, the architecture is designed to easily integrate real LLM models (OpenAI, Anthropic, local models) in future iterations.

## Architecture

### Module Structure

```
apps/core-api/src/modules/ai-ops/
├── ai-operations.service.ts    # Core AI logic engine
├── ai-ops.controller.ts        # REST API endpoints
├── ai-ops.module.ts           # NestJS module
└── __tests__/
    └── ai-operations.service.spec.ts  # 22 comprehensive tests
```

### Key Components

1. **AiOperationsService**: Orchestrates AI insights generation
   - Fetches comprehensive job data from Prisma
   - Applies business rules to generate summaries
   - Builds prioritized recommendations
   - Drafts customer messages with tone control

2. **AiOpsController**: Exposes 4 REST endpoints
   - `GET /api/v1/ai-ops/jobs/:jobId/summary`
   - `GET /api/v1/ai-ops/jobs/:jobId/recommendations`
   - `GET /api/v1/ai-ops/jobs/:jobId/insights` (summary + recommendations)
   - `POST /api/v1/ai-ops/jobs/:jobId/customer-message`

3. **Dashboard Page**: `/ai-ops` internal dashboard
   - Job ID lookup with real-time insights
   - Collapsible summary sections
   - Recommendations table with priority/category badges
   - Customer message generator with type/tone controls

## Data Types

### AiJobSummaryDTO
```typescript
{
  jobId: string;
  jobNumber: string | null;
  customerName: string | null;
  status: JobStatus;
  overallSummary: string;  // High-level summary paragraph
  sections: AiJobSummarySection[];  // Detailed sections
}
```

### AiJobRecommendationDTO
```typescript
{
  id: string;  // Unique recommendation ID
  label: string;  // Short action title
  description: string;  // Detailed recommendation
  category: AiRecommendationCategory;  // QC | RISK | SAFETY | etc.
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

### AiCustomerMessageDTO
```typescript
{
  jobId: string;
  type: 'STATUS_UPDATE' | 'ETA_UPDATE' | 'GENERIC';
  message: string;  // Draft message text
}
```

## AI Logic Engine

### Summary Generation

The service aggregates data from multiple sources to build comprehensive job insights:

**Data Sources:**
- `Job` - Core job info, status, dates
- `QCPhotoCheck` - Latest quality check results
- `JobRiskSnapshot` - Risk level and reasons
- `SafetyIncident` - Open/under-review incidents
- `MaterialOrder` - Delivery status and ETA
- `Warranty` + `WarrantyClaim` - Post-install service
- `SubcontractorAssignment` - Crew performance

**Summary Sections:**
1. **Overall Summary** - Single paragraph combining key factors
2. **Status & Progress** - Current status and last update
3. **Quality & Photos** - QC check results and missing photos
4. **Safety & Compliance** - Incidents and subcontractor performance
5. **Materials & Scheduling** - ETA status and delivery risk
6. **Warranty & Service** - Active warranties and open claims

### Recommendation Engine

The engine applies rule-based logic to generate prioritized recommendations:

| Condition | Category | Priority | Recommendation |
|---|---|---|---|
| QC status = FAIL | QC | HIGH | Upload Missing QC Photos |
| Risk level = HIGH | RISK | HIGH | Review High Risk Flags |
| Safety incidents (CRITICAL/HIGH) | SAFETY | HIGH | Follow Up on Safety Incidents |
| Material ETA = LATE | MATERIALS | HIGH | Contact Supplier or Reschedule |
| Subcontractor status = RED | SCHEDULING | HIGH | Review Subcontractor Performance |
| Open warranty claims > 0 | WARRANTY | MEDIUM | Prioritize Warranty Claims |
| Has HIGH priority recs | GENERAL | HIGH | Address High Priority Items |
| No HIGH priority issues | GENERAL | LOW | Maintain Momentum |

**Material ETA Logic:**
- **LATE**: `expectedDeliveryDate < now` AND not delivered
- **AT_RISK**: `daysUntil <= 3` AND not delivered
- **ON_TRACK**: `daysUntil > 3` OR already delivered

### Customer Message Templates

**STATUS_UPDATE:**
- Tone-aware greeting (Hi vs. Hello)
- Current status explanation
- Next step based on job status
- Friendly or formal closing

**ETA_UPDATE:**
- Material delivery status assessment
- Timeline expectations
- Delay explanations (if applicable)
- Installation scheduling info

**GENERIC:**
- Custom question acknowledgment
- Job context summary
- Open-ended helpful response

**Tone Control:**
- `FRIENDLY`: "Hi", "look forward", "excited", "Feel free"
- `FORMAL`: "Hello", "cooperation", "appreciate", "Please don't hesitate"

## API Endpoints

### GET /api/v1/ai-ops/jobs/:jobId/summary

Returns comprehensive AI-generated job summary.

**Response:**
```json
{
  "jobId": "abc123",
  "jobNumber": "J-45678",
  "customerName": "John Smith",
  "status": "IN_PROGRESS",
  "overallSummary": "This job is currently in IN_PROGRESS status with all quality checks passing...",
  "sections": [
    {
      "title": "Status & Progress",
      "body": "Job is in IN_PROGRESS status. Last updated 2 days ago."
    },
    ...
  ]
}
```

### GET /api/v1/ai-ops/jobs/:jobId/recommendations

Returns prioritized list of recommendations.

**Response:**
```json
[
  {
    "id": "upload-missing-qc-photos",
    "label": "Upload Missing QC Photos",
    "description": "Required photo categories are incomplete: INSTALLATION, ELECTRICAL...",
    "category": "QC",
    "priority": "HIGH"
  },
  ...
]
```

### GET /api/v1/ai-ops/jobs/:jobId/insights

Combined endpoint returning both summary and recommendations in one call.

**Response:**
```json
{
  "summary": { /* AiJobSummaryDTO */ },
  "recommendations": [ /* AiJobRecommendationDTO[] */ ]
}
```

### POST /api/v1/ai-ops/jobs/:jobId/customer-message

Generates customer-facing message.

**Request:**
```json
{
  "type": "STATUS_UPDATE",
  "tone": "FRIENDLY",
  "customQuestion": "your question about pricing"  // Optional, for GENERIC type
}
```

**Response:**
```json
{
  "jobId": "abc123",
  "type": "STATUS_UPDATE",
  "message": "Hi John Smith,\n\nYour solar installation project is currently in progress...\n\nWe appreciate your patience!"
}
```

## UI Components

### Job Lookup Panel
- Text input for Job ID or Job Number
- "Load Insights" button with loading state
- Error handling for invalid/missing jobs

### Summary Display
- Job metadata badges (ID, number, customer, status)
- Overall summary paragraph
- Collapsible sections with expand/collapse icons
- Clear visual hierarchy

### Recommendations Table
- Priority badges (RED for HIGH, AMBER for MEDIUM, GREEN for LOW)
- Category badges (color-coded by category)
- Label and description columns
- Sortable and scannable layout

### Message Generator
- Message type dropdown (Status Update / ETA Update / Generic)
- Tone selector (Friendly / Formal)
- Custom question input (for Generic type)
- "Generate Message" button
- Read-only textarea with generated draft
- Copy-to-clipboard functionality

## Testing

The service includes **22 comprehensive test cases** covering:

✅ Job not found (NotFoundException)  
✅ Simple LOW risk job with PASS QC  
✅ QC failures identified in summary  
✅ HIGH risk flags in summary  
✅ Open safety incidents reporting  
✅ QC photo upload recommendation  
✅ Risk review recommendation  
✅ Safety follow-up recommendation  
✅ Late materials supplier contact  
✅ Warranty claim attention  
✅ General recommendation (always included)  
✅ STATUS_UPDATE with FRIENDLY tone  
✅ STATUS_UPDATE with FORMAL tone  
✅ ETA_UPDATE with LATE materials  
✅ ETA_UPDATE with ON_TRACK materials  
✅ GENERIC message with custom question  
✅ Missing customer name handling  
✅ Combined insights (summary + recommendations)  

**Test Coverage:** All major paths and edge cases

## Future Enhancements (v2)

### Real LLM Integration
```typescript
interface AiProvider {
  generateSummary(jobData: JobContext): Promise<string>;
  generateRecommendations(jobData: JobContext): Promise<Recommendation[]>;
  generateMessage(jobData: JobContext, request: MessageRequest): Promise<string>;
}

class OpenAiProvider implements AiProvider { /* ... */ }
class AnthropicProvider implements AiProvider { /* ... */ }
class LocalLLMProvider implements AiProvider { /* ... */ }
```

### Configuration-Driven Behavior
```typescript
// Environment-based provider selection
const AI_PROVIDER = process.env.AI_PROVIDER || 'RULES_BASED';

// Hybrid mode: rules + LLM enhancement
if (AI_PROVIDER === 'HYBRID') {
  const baseSummary = this.generateRuleBasedSummary(job);
  const enhancedSummary = await llm.enhance(baseSummary);
}
```

### Analytics & Learning
- Track which recommendations are acted upon
- A/B test message tone effectiveness
- Learn from staff edits to generated messages
- Optimize rule thresholds based on outcomes

### Expanded Capabilities
- **Multi-job insights**: Portfolio-level summaries
- **Predictive recommendations**: "Job likely to miss deadline"
- **Proactive alerts**: Push notifications for HIGH priority items
- **Voice interface**: Generate audio summaries for field staff

## Development Notes

### Adding New Recommendation Rules

1. **Update the logic** in `AiOperationsService.generateRecommendations()`:
```typescript
// Example: Recommend design review for complex roofs
if (jobData.roofComplexity === 'COMPLEX' && jobData.status === 'DESIGN') {
  recommendations.push({
    id: 'review-complex-roof-design',
    label: 'Review Complex Roof Design',
    description: 'This roof has complexity factors requiring senior engineer review.',
    category: 'RISK',
    priority: 'MEDIUM',
  });
}
```

2. **Add test case** in `ai-operations.service.spec.ts`

3. **Document** the new rule in this file

### Message Template Customization

Templates are defined in `buildCustomerMessage()` methods. To customize:

1. Edit message strings in `buildStatusUpdateMessage()`, `buildEtaUpdateMessage()`, or `buildGenericMessage()`
2. Add new tone options by extending the `AiCustomerMessageRequestDTO.tone` type
3. Test both FRIENDLY and FORMAL variants

### Performance Optimization

Current query fetches all related data in a single Prisma call with strategic `include` clauses. If performance becomes an issue:

1. Add indexes to frequently-queried fields
2. Consider caching job summaries (TTL: 5 minutes)
3. Implement incremental summary updates (only re-compute changed sections)

## Related Documentation

- [Material & Scheduling System](./09-material-scheduling-system.md) - Material ETA logic used by AI insights
- [QC Photo System](./03-qc-photo-system.md) - QC status interpretation
- [Risk Scoring](./04-risk-scoring.md) - Risk level computation

## Metrics & Monitoring

**Key Metrics to Track:**
- Average summary generation time (target: <200ms)
- Recommendation acceptance rate by category
- Customer message edit rate (lower = better)
- HIGH priority recommendation resolution time

**Logging:**
- All AI insights calls logged with `AiOperationsService` logger
- Job ID, summary generation time, recommendation count
- Customer message type and tone

## Changelog

**v1.0 (Sprint 5)** - Initial release
- Deterministic rule-based AI logic
- 4 REST API endpoints
- Internal dashboard with job lookup
- 22 test cases with full coverage
- Documentation and integration guides
