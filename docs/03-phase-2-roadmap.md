# Phase 2 Roadmap: Operational Excellence

**Goal**: Expand platform with subcontractor management, safety tracking, warranty system, material management, and AI operations.

## Sprint 1: Subcontractor Directory (Weeks 11-12)

- Subcontractor CRUD and scoring system
- Performance metrics dashboard
- Specialty and availability tracking
- Integration with job assignments

## Sprint 2: Safety Tracking (Weeks 13-14)

- Safety incident reporting forms
- Incident severity classification
- Safety score per subcontractor
- Compliance reporting

## Sprint 3: Warranty Management (Weeks 15-16) ✅ COMPLETE

**Delivered:**
- Warranty activation and tracking system
- Warranty claim management (internal and portal)
- Automated expiry monitoring with daily scheduled jobs
- Customer portal warranty display and service request form
- Internal dashboard warranty overview page
- Full JobNimbus integration for activations, claims, and expiry warnings
- Unit tests for warranty service
- Complete API with 9 endpoints (warranty CRUD, claims, summary)

**Key Features:**
- Warranty activation upon job completion with configurable terms (default 10 years)
- Portal service request form for customers to submit warranty claims
- Summary dashboard with active, expiring, and expired warranty counts
- Claim status workflow: OPEN → IN_REVIEW → APPROVED/REJECTED → RESOLVED
- Priority levels: LOW, MEDIUM, HIGH
- Source tracking: PORTAL vs INTERNAL claims

**Documentation:**
- `docs/08-warranty-system.md` - Complete system documentation
- Test coverage in `apps/core-api/src/modules/warranty/__tests__/warranty.service.spec.ts`

## Sprint 4: Material ETA Tracking (Weeks 17-18)

- Material order management
- ETA status tracking (ordered/in-transit/delayed/delivered)
- Supplier integration
- Job delay predictions based on material status

## Sprint 5: AI Ops v1 (Weeks 19-20)

- AI-powered photo analysis for QC automation
- Risk prediction using ML models
- Anomaly detection in job data
- Automated alert prioritization

**Note**: Full Phase 2 details will be expanded during Phase 1 execution based on lessons learned.
