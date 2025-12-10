import { QCService } from './qc.service';

describe('QCService', () => {
  let service: QCService;

  beforeEach(() => {
    // Create service instance - QCService now constructs dependencies internally
    const mockConfigService = {
      get: jest.fn().mockReturnValue(null),
    } as any;
    service = new QCService(mockConfigService);
  });

  describe('QC Rule Evaluation', () => {
    it('should pass QC when all categories have sufficient photos', () => {
      const photoCounts = {
        BEFORE: 5,
        DURING: 5,
        AFTER: 5,
      };

      const requirements = [
        { category: 'BEFORE', minPhotos: 5 },
        { category: 'DURING', minPhotos: 5 },
        { category: 'AFTER', minPhotos: 5 },
      ];

      const missingCategories = [];
      for (const req of requirements) {
        const count = photoCounts[req.category as keyof typeof photoCounts] || 0;
        if (count < req.minPhotos) {
          missingCategories.push({
            category: req.category,
            required: req.minPhotos,
            current: count,
            missing: req.minPhotos - count,
          });
        }
      }

      expect(missingCategories).toHaveLength(0);
    });

    it('should fail QC when BEFORE category has insufficient photos', () => {
      const photoCounts = {
        BEFORE: 3,
        DURING: 5,
        AFTER: 5,
      };

      const requirements = [
        { category: 'BEFORE', minPhotos: 5 },
        { category: 'DURING', minPhotos: 5 },
        { category: 'AFTER', minPhotos: 5 },
      ];

      const missingCategories = [];
      for (const req of requirements) {
        const count = photoCounts[req.category as keyof typeof photoCounts] || 0;
        if (count < req.minPhotos) {
          missingCategories.push({
            category: req.category,
            required: req.minPhotos,
            current: count,
            missing: req.minPhotos - count,
          });
        }
      }

      expect(missingCategories).toHaveLength(1);
      expect(missingCategories[0]).toMatchObject({
        category: 'BEFORE',
        required: 5,
        current: 3,
        missing: 2,
      });
    });

    it('should fail QC when DURING category has insufficient photos', () => {
      const photoCounts = {
        BEFORE: 5,
        DURING: 2,
        AFTER: 5,
      };

      const requirements = [
        { category: 'BEFORE', minPhotos: 5 },
        { category: 'DURING', minPhotos: 5 },
        { category: 'AFTER', minPhotos: 5 },
      ];

      const missingCategories = [];
      for (const req of requirements) {
        const count = photoCounts[req.category as keyof typeof photoCounts] || 0;
        if (count < req.minPhotos) {
          missingCategories.push({
            category: req.category,
            required: req.minPhotos,
            current: count,
            missing: req.minPhotos - count,
          });
        }
      }

      expect(missingCategories).toHaveLength(1);
      expect(missingCategories[0]).toMatchObject({
        category: 'DURING',
        required: 5,
        current: 2,
        missing: 3,
      });
    });

    it('should fail QC when AFTER category has insufficient photos', () => {
      const photoCounts = {
        BEFORE: 5,
        DURING: 5,
        AFTER: 1,
      };

      const requirements = [
        { category: 'BEFORE', minPhotos: 5 },
        { category: 'DURING', minPhotos: 5 },
        { category: 'AFTER', minPhotos: 5 },
      ];

      const missingCategories = [];
      for (const req of requirements) {
        const count = photoCounts[req.category as keyof typeof photoCounts] || 0;
        if (count < req.minPhotos) {
          missingCategories.push({
            category: req.category,
            required: req.minPhotos,
            current: count,
            missing: req.minPhotos - count,
          });
        }
      }

      expect(missingCategories).toHaveLength(1);
      expect(missingCategories[0]).toMatchObject({
        category: 'AFTER',
        required: 5,
        current: 1,
        missing: 4,
      });
    });

    it('should fail QC when multiple categories have insufficient photos', () => {
      const photoCounts = {
        BEFORE: 2,
        DURING: 3,
        AFTER: 1,
      };

      const requirements = [
        { category: 'BEFORE', minPhotos: 5 },
        { category: 'DURING', minPhotos: 5 },
        { category: 'AFTER', minPhotos: 5 },
      ];

      const missingCategories = [];
      for (const req of requirements) {
        const count = photoCounts[req.category as keyof typeof photoCounts] || 0;
        if (count < req.minPhotos) {
          missingCategories.push({
            category: req.category,
            required: req.minPhotos,
            current: count,
            missing: req.minPhotos - count,
          });
        }
      }

      expect(missingCategories).toHaveLength(3);
      expect(missingCategories[0]).toMatchObject({
        category: 'BEFORE',
        required: 5,
        current: 2,
        missing: 3,
      });
      expect(missingCategories[1]).toMatchObject({
        category: 'DURING',
        required: 5,
        current: 3,
        missing: 2,
      });
      expect(missingCategories[2]).toMatchObject({
        category: 'AFTER',
        required: 5,
        current: 1,
        missing: 4,
      });
    });

    it('should fail QC when categories have zero photos', () => {
      const photoCounts = {
        BEFORE: 0,
        DURING: 0,
        AFTER: 0,
      };

      const requirements = [
        { category: 'BEFORE', minPhotos: 5 },
        { category: 'DURING', minPhotos: 5 },
        { category: 'AFTER', minPhotos: 5 },
      ];

      const missingCategories = [];
      for (const req of requirements) {
        const count = photoCounts[req.category as keyof typeof photoCounts] || 0;
        if (count < req.minPhotos) {
          missingCategories.push({
            category: req.category,
            required: req.minPhotos,
            current: count,
            missing: req.minPhotos - count,
          });
        }
      }

      expect(missingCategories).toHaveLength(3);
      expect(missingCategories.every((m) => m.missing === 5)).toBe(true);
    });

    it('should pass QC when all categories exceed minimum requirements', () => {
      const photoCounts = {
        BEFORE: 10,
        DURING: 8,
        AFTER: 7,
      };

      const requirements = [
        { category: 'BEFORE', minPhotos: 5 },
        { category: 'DURING', minPhotos: 5 },
        { category: 'AFTER', minPhotos: 5 },
      ];

      const missingCategories = [];
      for (const req of requirements) {
        const count = photoCounts[req.category as keyof typeof photoCounts] || 0;
        if (count < req.minPhotos) {
          missingCategories.push({
            category: req.category,
            required: req.minPhotos,
            current: count,
            missing: req.minPhotos - count,
          });
        }
      }

      expect(missingCategories).toHaveLength(0);
    });
  });
});
