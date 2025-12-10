# Phase 3 Roadmap: Automation & Intelligence

**Goal**: Full automation, intelligent dispatching, finance integrations, forecasting, and advanced command center.

## Sprint 1: QuickBooks Accounting Integration ✅ COMPLETE

**Status**: ✅ Delivered

**Deliverables**:
- ✅ QuickBooks Online API client (read-only)
- ✅ Contract amount sync from QB invoices
- ✅ Accounting source tracking (PLACEHOLDER, QUICKBOOKS, MANUAL)
- ✅ JobFinancialSnapshot schema extensions
- ✅ AccountingService with sync endpoints
- ✅ ProfitabilityService respects QuickBooks data
- ✅ Profit Dashboard UI enhancements (source badges, sync buttons)
- ✅ Comprehensive test coverage (99 tests passing)
- ✅ Full documentation (docs/12-accounting-integration.md)

**Technical Details**:
- `POST /api/v1/accounting/jobs/:jobId/sync` - Sync single job
- `POST /api/v1/accounting/sync-all` - Batch sync all active jobs
- Job.jobNimbusId ↔ QuickBooks Invoice.DocNumber mapping
- Configurable via environment variables (QB_ENABLED, QB_COMPANY_ID, etc.)
- Error-resilient with graceful fallback to placeholder data

**Future Enhancements**:
- OAuth2 automatic token refresh
- Cost breakdown sync (labor, materials, permits)
- Multi-invoice support
- Webhook integration for real-time updates
- Xero and other accounting platforms

## Sprint 2: Intelligent Dispatching

- AI-driven crew scheduling
- Route optimization
- Skills-based matching
- Real-time dispatch adjustments

## Sprint 3: Finance Integrations (Weeks 25-26)

- QuickBooks/Xero integration
- Invoice generation and tracking
- Payment status sync
- Financial reporting dashboard

## Sprint 4: Forecasting & Analytics (Weeks 27-28)

- Job completion date predictions
- Resource demand forecasting
- Revenue projections
- Trend analysis and insights

## Sprint 5: Command Center v2 (Weeks 29-30)

- Real-time operations dashboard
- Multi-team coordination
- Performance analytics
- Executive reporting and KPIs

**Note**: Phase 3 will be refined based on Phase 1 and Phase 2 outcomes and business priorities.
