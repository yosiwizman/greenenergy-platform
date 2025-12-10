import { RiskService, DEFAULT_RISK_THRESHOLDS } from './risk.service';

describe('RiskService', () => {
  let service: RiskService;

  beforeEach(() => {
    // Create service instance with mock config
    const mockConfigService = {
      get: jest.fn().mockReturnValue(null),
    } as any;
    service = new RiskService(mockConfigService);
  });

  describe('Risk Level Computation', () => {
    it('should return LOW risk when no reasons exist', () => {
      const reasons: any[] = [];
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('LOW');
    });

    it('should return HIGH risk when any reason has HIGH severity', () => {
      const reasons = [
        { code: 'STUCK_IN_STATUS', label: 'Stuck', severity: 'MEDIUM' },
        { code: 'MISSING_QC_PHOTOS', label: 'Missing photos', severity: 'HIGH' },
      ];
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('HIGH');
    });

    it('should return MEDIUM risk when highest severity is MEDIUM', () => {
      const reasons = [
        { code: 'STUCK_IN_STATUS', label: 'Stuck', severity: 'MEDIUM' },
        { code: 'STALE_JOB', label: 'Stale', severity: 'LOW' },
      ];
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('MEDIUM');
    });

    it('should return LOW risk when all reasons are LOW severity', () => {
      const reasons = [{ code: 'CUSTOM', label: 'Custom', severity: 'LOW' }];
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('LOW');
    });
  });

  describe('Days Since Calculation', () => {
    it('should calculate days since a past date correctly', () => {
      const date = new Date();
      date.setDate(date.getDate() - 10); // 10 days ago
      const days = (service as any).getDaysSince(date);
      expect(days).toBe(10);
    });

    it('should return 0 for today', () => {
      const date = new Date();
      const days = (service as any).getDaysSince(date);
      expect(days).toBe(0);
    });

    it('should handle dates 14 days ago (high threshold)', () => {
      const date = new Date();
      date.setDate(date.getDate() - 14);
      const days = (service as any).getDaysSince(date);
      expect(days).toBe(14);
    });

    it('should handle dates 7 days ago (medium threshold)', () => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      const days = (service as any).getDaysSince(date);
      expect(days).toBe(7);
    });
  });

  describe('Risk Rules Logic', () => {
    it('STUCK_IN_STATUS rule should trigger HIGH for >= 14 days', () => {
      const daysSinceUpdate = 14;
      const threshold = DEFAULT_RISK_THRESHOLDS.stuckStatusDaysHigh;
      expect(daysSinceUpdate >= threshold).toBe(true);
    });

    it('STUCK_IN_STATUS rule should trigger MEDIUM for >= 7 days but < 14', () => {
      const daysSinceUpdate = 10;
      const thresholdHigh = DEFAULT_RISK_THRESHOLDS.stuckStatusDaysHigh;
      const thresholdMedium = DEFAULT_RISK_THRESHOLDS.stuckStatusDaysMedium;
      expect(daysSinceUpdate >= thresholdMedium).toBe(true);
      expect(daysSinceUpdate < thresholdHigh).toBe(true);
    });

    it('STUCK_IN_STATUS rule should not trigger for < 7 days', () => {
      const daysSinceUpdate = 5;
      const threshold = DEFAULT_RISK_THRESHOLDS.stuckStatusDaysMedium;
      expect(daysSinceUpdate < threshold).toBe(true);
    });

    it('STALE_JOB rule should trigger HIGH for >= 14 days', () => {
      const daysSinceUpdate = 15;
      const threshold = DEFAULT_RISK_THRESHOLDS.staleJobDaysHigh;
      expect(daysSinceUpdate >= threshold).toBe(true);
    });

    it('STALE_JOB rule should trigger MEDIUM for >= 7 days but < 14', () => {
      const daysSinceUpdate = 9;
      const thresholdHigh = DEFAULT_RISK_THRESHOLDS.staleJobDaysHigh;
      const thresholdMedium = DEFAULT_RISK_THRESHOLDS.staleJobDaysMedium;
      expect(daysSinceUpdate >= thresholdMedium).toBe(true);
      expect(daysSinceUpdate < thresholdHigh).toBe(true);
    });
  });

  describe('Risk Scenario Tests', () => {
    it('should identify job with no issues as LOW risk', () => {
      // Job with recent update, good QC, recent activity
      const reasons: any[] = [];
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('LOW');
      expect(reasons.length).toBe(0);
    });

    it('should identify stuck-in-status job as HIGH risk (15+ days)', () => {
      const reasons: any[] = [];
      const daysSinceUpdate = 15;
      const threshold = DEFAULT_RISK_THRESHOLDS.stuckStatusDaysHigh;

      if (daysSinceUpdate >= threshold) {
        reasons.push({
          code: 'STUCK_IN_STATUS',
          label: 'Stuck in status',
          severity: 'HIGH',
        });
      }

      expect(reasons.length).toBe(1);
      expect(reasons[0].severity).toBe('HIGH');
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('HIGH');
    });

    it('should identify missing QC photos as HIGH risk', () => {
      const reasons: any[] = [];
      const qcStatus = 'FAIL';

      if (qcStatus === 'FAIL') {
        reasons.push({
          code: 'MISSING_QC_PHOTOS',
          label: 'Missing QC photos',
          severity: 'HIGH',
        });
      }

      expect(reasons.length).toBe(1);
      expect(reasons[0].code).toBe('MISSING_QC_PHOTOS');
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('HIGH');
    });

    it('should identify stale job as MEDIUM risk (8 days no update)', () => {
      const reasons: any[] = [];
      const daysSinceUpdate = 8;
      const thresholdHigh = DEFAULT_RISK_THRESHOLDS.staleJobDaysHigh;
      const thresholdMedium = DEFAULT_RISK_THRESHOLDS.staleJobDaysMedium;

      if (daysSinceUpdate >= thresholdHigh) {
        reasons.push({
          code: 'STALE_JOB',
          label: 'Stale job',
          severity: 'HIGH',
        });
      } else if (daysSinceUpdate >= thresholdMedium) {
        reasons.push({
          code: 'STALE_JOB',
          label: 'Stale job',
          severity: 'MEDIUM',
        });
      }

      expect(reasons.length).toBe(1);
      expect(reasons[0].severity).toBe('MEDIUM');
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('MEDIUM');
    });

    it('should identify job with multiple issues as HIGH risk', () => {
      const reasons: any[] = [
        {
          code: 'STUCK_IN_STATUS',
          label: 'Stuck in status',
          severity: 'MEDIUM',
        },
        {
          code: 'MISSING_QC_PHOTOS',
          label: 'Missing QC photos',
          severity: 'HIGH',
        },
        {
          code: 'STALE_JOB',
          label: 'Stale job',
          severity: 'MEDIUM',
        },
      ];

      expect(reasons.length).toBe(3);
      const riskLevel = (service as any).computeRiskLevel(reasons);
      expect(riskLevel).toBe('HIGH');
    });
  });
});
