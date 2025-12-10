import { PhotoService } from './photo.service';
import { JobNimbusPhoto } from '@greenenergy/jobnimbus-sdk';

describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(() => {
    // Create service instance - PhotoService now constructs dependencies internally
    const mockConfigService = {
      get: jest.fn().mockReturnValue(null),
    } as any;
    service = new PhotoService(mockConfigService);
  });

  describe('classifyPhoto', () => {
    it('should classify photo as BEFORE based on tags', () => {
      const photo: JobNimbusPhoto = {
        id: '1',
        jobId: 'job-123',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: ['before', 'inspection'],
        folderName: undefined,
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('BEFORE');
    });

    it('should classify photo as DURING based on tags', () => {
      const photo: JobNimbusPhoto = {
        id: '2',
        jobId: 'job-123',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: ['during', 'work-in-progress'],
        folderName: undefined,
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('DURING');
    });

    it('should classify photo as AFTER based on tags', () => {
      const photo: JobNimbusPhoto = {
        id: '3',
        jobId: 'job-123',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: ['after', 'completion'],
        folderName: undefined,
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('AFTER');
    });

    it('should classify photo as BEFORE based on folder name', () => {
      const photo: JobNimbusPhoto = {
        id: '4',
        jobId: 'job-123',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: 'Before Photos',
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('BEFORE');
    });

    it('should classify photo as DURING based on folder name', () => {
      const photo: JobNimbusPhoto = {
        id: '5',
        jobId: 'job-123',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: 'During Install',
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('DURING');
    });

    it('should classify photo as AFTER based on folder name', () => {
      const photo: JobNimbusPhoto = {
        id: '6',
        jobId: 'job-123',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: 'After Completion',
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('AFTER');
    });

    it('should classify photo as BEFORE based on filename', () => {
      const photo: JobNimbusPhoto = {
        id: '7',
        jobId: 'job-123',
        url: 'https://example.com/before-123.jpg',
        filename: 'before-123.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: undefined,
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('BEFORE');
    });

    it('should classify photo as DURING based on filename', () => {
      const photo: JobNimbusPhoto = {
        id: '8',
        jobId: 'job-123',
        url: 'https://example.com/during-work.jpg',
        filename: 'during-work.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: undefined,
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('DURING');
    });

    it('should classify photo as AFTER based on filename', () => {
      const photo: JobNimbusPhoto = {
        id: '9',
        jobId: 'job-123',
        url: 'https://example.com/after-final.jpg',
        filename: 'after-final.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: undefined,
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('AFTER');
    });

    it('should default to DURING when no classification hints found', () => {
      const photo: JobNimbusPhoto = {
        id: '10',
        jobId: 'job-123',
        url: 'https://example.com/random.jpg',
        filename: 'random.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: undefined,
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('DURING');
    });

    it('should prioritize tags over folder name', () => {
      const photo: JobNimbusPhoto = {
        id: '11',
        jobId: 'job-123',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: ['before'],
        folderName: 'After Photos',
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('BEFORE');
    });

    it('should prioritize folder name over filename', () => {
      const photo: JobNimbusPhoto = {
        id: '12',
        jobId: 'job-123',
        url: 'https://example.com/after.jpg',
        filename: 'after.jpg',
        mimeType: 'image/jpeg',
        takenAt: undefined,
        uploadedAt: new Date().toISOString(),
        tags: [],
        folderName: 'Before Inspection',
      };

      const result = service.classifyPhoto(photo);
      expect(result).toBe('BEFORE');
    });
  });
});
