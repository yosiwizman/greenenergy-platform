import nock from 'nock';
import { JobNimbusClient, JobNimbusError } from '../index';

describe('JobNimbusClient', () => {
  const baseUrl = 'https://api.jobnimbus.com';
  const apiKey = 'test-api-key';
  let client: JobNimbusClient;

  beforeEach(() => {
    client = new JobNimbusClient({ baseUrl, apiKey });
    // Suppress console logs in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  describe('fetchJobs', () => {
    it('should fetch jobs successfully', async () => {
      const mockJobs = [
        {
          jnid: 'job-1',
          display_name: 'Test Job',
          address: '123 Main St',
          status: 'IN_PROGRESS',
        },
      ];

      nock(baseUrl).get('/jobs').query({ limit: 100, page: 1 }).reply(200, mockJobs);

      const result = await client.fetchJobs();

      expect(result).toEqual(mockJobs);
      expect(result).toHaveLength(1);
    });

    it('should handle pagination parameters', async () => {
      nock(baseUrl).get('/jobs').query({ limit: 50, page: 2 }).reply(200, []);

      await client.fetchJobs({ limit: 50, page: 2 });

      expect(nock.isDone()).toBe(true);
    });

    it('should throw JobNimbusError on API error', async () => {
      nock(baseUrl).get('/jobs').query(true).reply(401, { message: 'Unauthorized' });

      await expect(client.fetchJobs()).rejects.toThrow(JobNimbusError);
    });
  });

  describe('fetchJobById', () => {
    it('should fetch a single job by ID', async () => {
      const mockJob = {
        jnid: 'job-123',
        display_name: 'Test Job',
        address: '456 Oak St',
      };

      nock(baseUrl).get('/jobs/job-123').reply(200, mockJob);

      const result = await client.fetchJobById('job-123');

      expect(result).toEqual(mockJob);
      expect(result.jnid).toBe('job-123');
    });
  });

  describe('fetchContacts', () => {
    it('should fetch contacts successfully', async () => {
      const mockContacts = [
        {
          jnid: 'contact-1',
          display_name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
        },
      ];

      nock(baseUrl).get('/contacts').query({ limit: 100, page: 1 }).reply(200, mockContacts);

      const result = await client.fetchContacts();

      expect(result).toEqual(mockContacts);
      expect(result).toHaveLength(1);
    });
  });

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      const mockResponse = { jnid: 'note-123' };

      nock(baseUrl)
        .post('/notes', {
          note: 'Test note',
          record_id: 'job-123',
          record_type: 'job',
          created_by: 'system',
        })
        .reply(200, mockResponse);

      const result = await client.createNote('job-123', {
        text: 'Test note',
      });

      expect(result).toEqual({ id: 'note-123' });
    });
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const mockResponse = { jnid: 'task-456' };

      nock(baseUrl)
        .post('/tasks', {
          title: 'Test task',
          record_id: 'job-123',
          record_type: 'job',
          due_date: '2024-12-31',
          assigned_to: 'user-1',
        })
        .reply(200, mockResponse);

      const result = await client.createTask('job-123', {
        title: 'Test task',
        dueDate: '2024-12-31',
        assignedTo: 'user-1',
      });

      expect(result).toEqual({ id: 'task-456' });
    });
  });

  describe('healthCheck', () => {
    it('should return ok status when API is accessible', async () => {
      nock(baseUrl).get('/jobs').query({ limit: 1 }).reply(200, []);

      const result = await client.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.message).toBe('JobNimbus API is accessible');
    });

    it('should return error status when API is not accessible', async () => {
      nock(baseUrl).get('/jobs').query({ limit: 1 }).reply(500, { message: 'Server error' });

      const result = await client.healthCheck();

      expect(result.status).toBe('error');
      expect(result.message).toContain('JobNimbus API error');
    });
  });

  describe('Error handling', () => {
    it('should create JobNimbusError with correct status code', async () => {
      nock(baseUrl).get('/jobs/nonexistent').reply(404, { message: 'Not found' });

      try {
        await client.fetchJobById('nonexistent');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JobNimbusError);
        expect((error as JobNimbusError).statusCode).toBe(404);
        expect((error as JobNimbusError).isAuthError()).toBe(false);
      }
    });

    it('should detect auth errors', async () => {
      nock(baseUrl).get('/jobs').query(true).reply(401, { message: 'Unauthorized' });

      try {
        await client.fetchJobs();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JobNimbusError);
        expect((error as JobNimbusError).isAuthError()).toBe(true);
      }
    });

    it('should detect rate limit errors', async () => {
      nock(baseUrl).get('/jobs').query(true).reply(429, { message: 'Too many requests' });

      try {
        await client.fetchJobs();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JobNimbusError);
        expect((error as JobNimbusError).isRateLimitError()).toBe(true);
      }
    });
  });
});
