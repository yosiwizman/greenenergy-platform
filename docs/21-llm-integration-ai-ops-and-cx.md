# LLM Integration for AI Operations & Customer Experience (Phase 10 Sprint 1)

## Overview

Phase 10 Sprint 1 introduces **LLM (Large Language Model) integration** to power AI-driven features in the GreenEnergy platform, specifically targeting **AiOperations** and **Customer Experience** workflows.

This sprint adds:
- **Provider-agnostic LLM client** in core-api (OpenAI as first provider)
- **LLM-powered job summaries** for operations teams
- **LLM-powered customer message drafts** for CX teams
- **Deterministic fallback** to ensure system reliability when LLM is unavailable
- **Feature toggles** for gradual rollout and risk mitigation

### Design Philosophy

1. **Safety First**: LLM is **optional** and can be disabled via env vars
2. **Fallback Always**: Every LLM feature has a deterministic rule-based fallback
3. **No Direct Customer Exposure**: LLM generates **drafts** for internal review, not auto-sent messages
4. **Provider Agnostic**: Architecture supports multiple LLM providers (OpenAI, Anthropic, local models)
5. **Observability**: All LLM calls are logged; `isFallback` flag indicates when fallback is used

---

## Architecture

### Core Components

1. **LlmService** (`apps/core-api/src/modules/llm/llm.service.ts`)
   - Provider-agnostic interface for text generation
   - Uses Node 20+ native `fetch` (no external HTTP client dependency)
   - OpenAI Chat Completions API integration (GPT-4o-mini default)
   - Error handling and retry logic

2. **AiOperationsService enhancements**
   - `generateJobSummaryWithLlm()` - LLM-powered job summaries
   - `generateCustomerMessageWithLlm()` - LLM-powered CX message drafts
   - Automatic fallback to existing rule-based methods

3. **New API Endpoints**
   - `POST /api/v1/ai-ops/jobs/:jobId/summary/llm` - Get LLM job summary
   - `POST /api/v1/ai-ops/jobs/:jobId/customer-message/llm` - Get LLM customer message draft

4. **Internal Dashboard Updates**
   - "Generate AI Summary" button on job detail page
   - "Generate AI Message Draft" button with tone/context selection

---

## Configuration

### Environment Variables

Add these to `apps/core-api/.env`:

```bash
# LLM Provider Configuration
LLM_PROVIDER="openai"                  # Provider: "openai" (future: "anthropic", "local")
LLM_MODEL="gpt-4o-mini"                # Model name (overridable per request)
LLM_API_KEY="your-llm-api-key-here"    # API key (do NOT commit)
LLM_MAX_TOKENS="800"                   # Max completion tokens (default)
LLM_TEMPERATURE="0.2"                  # Temperature 0-1 (conservative for business use)

# Feature Toggles
ENABLE_LLM_FOR_AI_OPS="false"          # Set "true" to enable LLM for AI Ops summaries
ENABLE_LLM_FOR_CX_MESSAGES="false"     # Set "true" to enable LLM for CX message drafts
```

### Configuration Validation

- If `LLM_PROVIDER` or `LLM_API_KEY` are missing, `LlmService.isEnabled()` returns `false`
- If feature toggle is `false`, service uses fallback logic
- If LLM call fails (network, rate limit, etc.), service uses fallback logic

---

## Usage

### Using AiOps LLM Features in Internal Dashboard

Internal operators can trigger LLM-backed AiOps features directly from the **internal dashboard**:

1. Navigate to `/ai-ops` in the internal dashboard.
2. Enter a Job ID and click **Load Insights** (loads the rule-based summary + recommendations).
3. Use **AI Summary** → **Generate AI Summary** to call:
   - `POST /api/v1/ai-ops/jobs/:jobId/summary/llm`
4. Use **AI Customer Message Draft** to generate a draft message for the selected job:
   - Select Channel (EMAIL/SMS), Tone, and Context
   - Optionally add extra context
   - Click **Generate AI Message Draft** to call:
     - `POST /api/v1/ai-ops/jobs/:jobId/customer-message/llm`
5. The UI always shows:
   - `model` returned from the backend
   - Whether the result is fallback (`isFallback: true`) vs LLM
   - A local “generated at” timestamp (client-side)

Notes:
- No message is auto-sent. The dashboard only generates a draft and provides copy-to-clipboard actions.
- If `ENABLE_LLM_FOR_AI_OPS` or `ENABLE_LLM_FOR_CX_MESSAGES` is `false` (or the provider/API key is not configured), the backend returns deterministic fallbacks with `isFallback: true`.

### AI Operations: Job Summary

**Internal UI Flow**:
1. User navigates to `/ai-ops` page and selects a job
2. User clicks "Generate AI Summary" button
3. Frontend calls `POST /api/v1/ai-ops/jobs/:jobId/summary/llm`
4. Backend returns:
   - LLM-generated summary (if enabled and successful)
   - OR rule-based fallback summary (with `isFallback: true`)
5. UI displays summary with model name and fallback indicator

**API Response**:
```typescript
{
  jobId: string;
  summary: string;              // Markdown-formatted summary
  recommendations?: string;     // Optional recommendations section
  model: string;                // e.g. "gpt-4o-mini" or "deterministic-fallback"
  isFallback: boolean;          // true if fallback was used
}
```

**LLM Prompt Design**:
- **System Prompt**: Sets role as "expert operations assistant for roofing/solar company"
- **User Prompt**: Provides structured job context (status, QC, risk, safety, materials, subcontractor, warranty)
- **Output Format**: 4–7 bullet point summary + 2–4 risk highlights + 3 next actions
- **Constraints**: <500 words, no internal IDs, professional tone

### Customer Experience: Message Drafts

**Internal UI Flow**:
1. User navigates to job's CX messaging section
2. User clicks "Generate AI Draft" button
3. Modal opens with tone selector (friendly/formal/direct) and context selector (general_update/payment_reminder/scheduling/post_install)
4. Frontend calls `POST /api/v1/ai-ops/jobs/:jobId/customer-message/llm` with selected tone/context
5. Backend returns LLM-generated or template-based message
6. UI inserts message into textarea with label "AI-generated draft (review before sending)"
7. User reviews, edits, and manually sends via existing CX workflow

**API Request**:
```typescript
{
  tone?: 'friendly' | 'formal' | 'direct';  // default: 'friendly'
  context?: 'general_update' | 'payment_reminder' | 'scheduling' | 'post_install';
}
```

**API Response**:
```typescript
{
  jobId: string;
  tone: 'friendly' | 'formal' | 'direct';
  message: string;              // Customer-facing message text
  model: string;                // e.g. "gpt-4o-mini" or "deterministic-fallback"
  isFallback: boolean;          // true if fallback was used
}
```

**LLM Prompt Design**:
- **System Prompt**: Sets role as "message writer for homeowners", tone instructions, safety constraints
- **User Prompt**: Provides job context + message context type
- **Output Format**: <180 words, customer-friendly language
- **Safety Constraints**: No legal promises, no internal details, no technical jargon

---

## Fallback Behavior

### When Fallback is Triggered

1. LLM feature toggle is `false` (`ENABLE_LLM_FOR_AI_OPS` or `ENABLE_LLM_FOR_CX_MESSAGES`)
2. LLM provider or API key not configured (`LlmService.isEnabled() === false`)
3. LLM API call fails (network error, rate limit, invalid response, etc.)

### Fallback Logic

#### Job Summary Fallback
- Uses existing `getJobSummary()` and `getJobRecommendations()` methods
- Formats output as plaintext with sections
- Returns `model: "deterministic-fallback"` and `isFallback: true`

#### Customer Message Fallback
- Uses template-based message generation (`buildTemplateCustomerMessage()`)
- Templates are tone-aware and context-aware
- Returns `model: "deterministic-fallback"` and `isFallback: true`

### Observability

- All fallback events are logged at `info` level: `"LLM disabled for AI Ops, using fallback for job: {jobId}"`
- All LLM failures are logged at `error` level: `"LLM generation failed for job {jobId}: {error.message}"`
- Frontend displays fallback indicator: "Using fallback summary (LLM disabled or unavailable)"

---

## Security & Safety

### API Key Management

- **Never commit** `LLM_API_KEY` to version control
- Store in Railway env vars for staging/production
- Rotate keys periodically (e.g., every 90 days)

### Prompt Injection Prevention

- Job context is structured data (not user input)
- No raw user input is passed to LLM
- System prompts are hardcoded in service layer

### Customer Message Safety

1. **No Auto-Send**: LLM messages are **drafts only**; human must review and send
2. **No Legal Promises**: System prompt explicitly forbids guarantees
3. **No Internal Details**: System prompt forbids mentioning internal systems, IDs, or technical details
4. **Tone Control**: User selects tone (friendly/formal/direct) to ensure brand consistency

### Rate Limiting & Cost Control

- Default `LLM_MAX_TOKENS=800` keeps costs low (avg ~$0.001 per request with GPT-4o-mini)
- Temperature set to `0.2` for deterministic, business-safe outputs
- No streaming (simpler, safer for backend-to-backend calls)
- Consider adding per-user or per-job rate limits in future sprints

---

## LLM Usage Monitoring Console (Phase 10 Sprint 5)

Phase 10 Sprint 5 adds **best-effort LLM usage logging** and a lightweight internal console so operators can monitor:
- Call volume
- Success vs fallback vs errors
- Usage by feature and model
- Rough cost estimate
- Recent-call audit log

### Database: `LlmCallLog`

LLM calls are stored in an append-only Postgres table:
- Prisma model: `LlmCallLog`
- Table: `llm_call_logs`

Key fields include:
- `feature` (e.g. `AI_OPS_JOB_SUMMARY`, `AI_OPS_CUSTOMER_MESSAGE`)
- `provider`, `model`
- `tokensIn`, `tokensOut`, `durationMs`
- `isFallback`, `success`, `errorCode`
- `environment` (e.g. staging/production)

### Internal API Endpoints

Protected with `InternalApiKeyGuard` (`x-internal-api-key` header required):
- `GET /api/v1/llm-usage/summary?days=7|30|90`
- `GET /api/v1/llm-usage/recent?limit=50`

### Internal Dashboard

Navigate to `/llm-usage` in the internal dashboard to view the summary cards, breakdown tables, and recent audit log.

### Logging Guarantees

- Logging is **best-effort** and should never break the user-facing request.
- Fallback events are logged as `isFallback: true` and `success: true`.
- Hard failures (no fallback) should be logged as `success: false`.

### Cost Estimate

Summary endpoints compute a rough cost estimate based on token counts using GPT-4o-mini-like pricing:
- Input tokens: `$0.15 / 1M`
- Output tokens: `$0.60 / 1M`

Values are rounded to **4 decimals**.

---

## Testing

### Unit Tests

1. **LlmService Tests** (`apps/core-api/src/modules/llm/__tests__/llm.service.spec.ts`)
   - Mock `ConfigService` and `global.fetch`
   - Test cases:
     - LLM not configured → throws `LLM_NOT_CONFIGURED`
     - OpenAI success → parses `text` and `usage` correctly
     - Non-OK HTTP response → throws `LLM_REQUEST_FAILED`

2. **AiOperationsService LLM Tests** (extend `ai-operations.service.spec.ts`)
   - Mock `LlmService`, `ConfigService`, and dependencies
   - Test cases:
     - `ENABLE_LLM_FOR_AI_OPS=false` → uses fallback
     - LLM enabled + success → returns `isFallback=false`, correct model
     - LLM enabled + failure → returns fallback with `isFallback=true`
     - Similar tests for `generateCustomerMessageWithLlm`

### Integration Testing

1. **Manual Testing (Staging)**
   - Enable LLM with valid OpenAI API key
   - Test "Generate AI Summary" button on `/ai-ops` page
   - Test "Generate AI Message Draft" with all tone/context combinations
   - Verify fallback behavior when LLM is disabled

2. **End-to-End Testing (Future Sprint)**
   - Add Playwright tests for LLM UI interactions
   - Mock LLM API responses in test environment

---

## Deployment

### Staging Deployment

1. Set Railway env vars:
   ```bash
   LLM_PROVIDER=openai
   LLM_MODEL=gpt-4o-mini
   LLM_API_KEY=<your-openai-api-key>
   LLM_MAX_TOKENS=800
   LLM_TEMPERATURE=0.2
   ENABLE_LLM_FOR_AI_OPS=true           # Enable for internal testing
   ENABLE_LLM_FOR_CX_MESSAGES=false     # Disable until fully validated
   ```

2. Deploy core-api and internal-dashboard

3. Smoke test:
   - Navigate to `/ai-ops` page
   - Click "Generate AI Summary" on a test job
   - Verify summary is generated and displays model name
   - Disable `ENABLE_LLM_FOR_AI_OPS` and verify fallback works

### Production Deployment

1. Gradual rollout:
   - **Week 1**: Deploy with `ENABLE_LLM_FOR_AI_OPS=false` (test infra only)
   - **Week 2**: Enable `ENABLE_LLM_FOR_AI_OPS=true` for internal team testing
   - **Week 3**: Enable `ENABLE_LLM_FOR_CX_MESSAGES=true` after validation
   - **Week 4+**: Monitor usage, costs, and quality

2. Monitoring:
   - Track LLM API call success/failure rates
   - Track fallback usage percentage
   - Monitor OpenAI API costs (usage dashboard)
   - Collect user feedback on LLM-generated content quality

---

## Cost Analysis

### OpenAI Pricing (GPT-4o-mini, as of Dec 2024)

- Input: $0.00015 per 1K tokens
- Output: $0.0006 per 1K tokens

### Estimated Costs

#### Job Summary
- Avg input: ~500 tokens (job context)
- Avg output: ~400 tokens (summary)
- Cost per summary: ~$0.0003

#### Customer Message
- Avg input: ~400 tokens (job context + instructions)
- Avg output: ~150 tokens (message)
- Cost per message: ~$0.00015

#### Monthly Estimate (100 active users)
- 1000 summaries/month: $0.30
- 500 messages/month: $0.08
- **Total: ~$0.40/month** (negligible)

With GPT-4o-mini's low cost, even heavy usage (<10K requests/month) remains under $5/month.

---

## Future Enhancements (Post-Sprint 1)

### Sprint 2+ Ideas

1. **Multi-Provider Support**
   - Add Anthropic (Claude) provider
   - Add local model support (Ollama, llama.cpp)
   - Provider selection via env var

2. **Advanced Features**
   - Streaming responses for real-time UI updates
   - Multi-turn conversations for CX message refinement
   - Context-aware follow-up suggestions

3. **Quality Improvements**
   - A/B testing: LLM vs. rule-based summaries
   - User feedback collection (thumbs up/down)
   - Fine-tuning on company-specific data

4. **CX Automation**
   - Auto-send low-risk messages (e.g., status updates) after human approval workflow
   - Email template personalization with LLM
   - SMS message generation (with strict character limits)

5. **Cost Optimization**
   - Caching frequent prompts/responses
   - Batch processing for non-urgent requests
   - Fallback to smaller models for simple tasks

---

## Troubleshooting

### LLM Not Working

1. **Check env vars**:
   ```bash
   # In Railway dashboard or .env file
   LLM_PROVIDER=openai
   LLM_API_KEY=<valid-key>
   ENABLE_LLM_FOR_AI_OPS=true
   ```

2. **Check logs**:
   - Look for `"LLM disabled for AI Ops, using fallback"` → feature toggle or missing config
   - Look for `"LLM generation failed"` → API error or network issue

3. **Verify API key**:
   - Test with `curl`:
     ```bash
     curl https://api.openai.com/v1/chat/completions \
       -H "Authorization: Bearer $LLM_API_KEY" \
       -H "Content-Type: application/json" \
       -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'
     ```

4. **Check OpenAI quota**:
   - Visit https://platform.openai.com/usage
   - Verify account has available credits

### Fallback Always Used

- If `isFallback: true` in every response, check:
  1. `ENABLE_LLM_FOR_AI_OPS` or `ENABLE_LLM_FOR_CX_MESSAGES` is set to `"true"` (string, not boolean)
  2. `LLM_PROVIDER` and `LLM_API_KEY` are set
  3. Check core-api logs for error messages

### High Latency

- LLM API calls typically take 2-5 seconds
- If >10 seconds, check:
  - Network connectivity to `https://api.openai.com`
  - Railway region (use US-based for OpenAI)
  - OpenAI service status: https://status.openai.com

---

## References

- OpenAI API Docs: https://platform.openai.com/docs/api-reference
- GPT-4o-mini Model Card: https://platform.openai.com/docs/models/gpt-4o-mini
- Shared Types: `packages/shared-types/src/index.ts`
- LlmService: `apps/core-api/src/modules/llm/llm.service.ts`
- AiOperationsService: `apps/core-api/src/modules/ai-ops/ai-operations.service.ts`

---

## Changelog

### Phase 10 Sprint 1 (Dec 2024)
- ✅ Added LlmService with OpenAI integration
- ✅ Added LLM-powered job summaries for AI Ops
- ✅ Added LLM-powered customer message drafts
- ✅ Implemented deterministic fallback for all LLM features
- ✅ Added feature toggles for gradual rollout
- ✅ Created internal dashboard UI for LLM features
- ✅ Added unit tests for LlmService and AiOps LLM methods
