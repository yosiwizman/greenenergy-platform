import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import type { Job, Contact } from '@greenenergy/shared-types';
import { JobNimbusError } from './errors';

export interface JobNimbusConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface JobNimbusJob {
  jnid: string;
  display_name: string;
  address?: string;
  status?: string;
  status_name?: string;
  assigned_to?: string;
  start_date?: string;
  completion_date?: string;
  system_size?: number;
  created_date?: string;
  updated_date?: string;
  description?: string;
}

export interface JobNimbusContact {
  jnid: string;
  display_name: string;
  email?: string;
  phone?: string;
  role?: string;
  is_primary?: boolean;
  created_date?: string;
}

export interface JobNimbusPhoto {
  id: string;
  jobId: string;
  url: string;
  filename?: string;
  mimeType?: string;
  takenAt?: string;
  uploadedAt?: string;
  tags?: string[];
  folderName?: string;
}

export class JobNimbusClient {
  private client: AxiosInstance;
  private logger = console;

  constructor(config: JobNimbusConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Log that client is configured (without exposing API key)
    this.logger.log('[JobNimbusClient] Initialized with base URL:', config.baseUrl);
  }

  /**
   * Fetch all jobs from JobNimbus
   * Supports pagination and filtering by update date
   */
  async fetchJobs(params?: {
    updatedSince?: string;
    limit?: number;
    page?: number;
  }): Promise<JobNimbusJob[]> {
    try {
      const queryParams: any = {
        limit: params?.limit || 100,
        page: params?.page || 1,
      };

      if (params?.updatedSince) {
        queryParams.updated_since = params.updatedSince;
      }

      this.logger.log('[JobNimbusClient] Fetching jobs with params:', queryParams);

      const response = await this.client.get<JobNimbusJob[]>('/jobs', {
        params: queryParams,
      });

      this.logger.log(`[JobNimbusClient] Fetched ${response.data.length} jobs`);
      return response.data;
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error('[JobNimbusClient] Error fetching jobs:', jnError.message);
      throw jnError;
    }
  }

  /**
   * Fetch a single job by JobNimbus ID
   */
  async fetchJobById(jnid: string): Promise<JobNimbusJob> {
    try {
      this.logger.log(`[JobNimbusClient] Fetching job: ${jnid}`);
      const response = await this.client.get<JobNimbusJob>(`/jobs/${jnid}`);
      return response.data;
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error(`[JobNimbusClient] Error fetching job ${jnid}:`, jnError.message);
      throw jnError;
    }
  }

  /**
   * Fetch contacts from JobNimbus
   * Can filter by job or get all contacts
   */
  async fetchContacts(params?: {
    updatedSince?: string;
    limit?: number;
    page?: number;
  }): Promise<JobNimbusContact[]> {
    try {
      const queryParams: any = {
        limit: params?.limit || 100,
        page: params?.page || 1,
      };

      if (params?.updatedSince) {
        queryParams.updated_since = params.updatedSince;
      }

      this.logger.log('[JobNimbusClient] Fetching contacts with params:', queryParams);

      const response = await this.client.get<JobNimbusContact[]>('/contacts', {
        params: queryParams,
      });

      this.logger.log(`[JobNimbusClient] Fetched ${response.data.length} contacts`);
      return response.data;
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error('[JobNimbusClient] Error fetching contacts:', jnError.message);
      throw jnError;
    }
  }

  /**
   * Create a note on a job in JobNimbus
   */
  async createNote(
    jobId: string,
    payload: { text: string; createdBy?: string }
  ): Promise<{ id: string }> {
    try {
      this.logger.log(`[JobNimbusClient] Creating note for job: ${jobId}`);

      const noteData = {
        note: payload.text,
        record_id: jobId,
        record_type: 'job',
        created_by: payload.createdBy || 'system',
      };

      const response = await this.client.post('/notes', noteData);

      this.logger.log(`[JobNimbusClient] Created note: ${response.data.jnid}`);
      return { id: response.data.jnid };
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error(`[JobNimbusClient] Error creating note:`, jnError.message);
      throw jnError;
    }
  }

  /**
   * Create a task on a job in JobNimbus
   */
  async createTask(
    jobId: string,
    payload: { title: string; dueDate?: string; assignedTo?: string }
  ): Promise<{ id: string }> {
    try {
      this.logger.log(`[JobNimbusClient] Creating task for job: ${jobId}`);

      const taskData = {
        title: payload.title,
        record_id: jobId,
        record_type: 'job',
        due_date: payload.dueDate,
        assigned_to: payload.assignedTo,
      };

      const response = await this.client.post('/tasks', taskData);

      this.logger.log(`[JobNimbusClient] Created task: ${response.data.jnid}`);
      return { id: response.data.jnid };
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error(`[JobNimbusClient] Error creating task:`, jnError.message);
      throw jnError;
    }
  }

  /**
   * Upload an attachment to a job in JobNimbus
   */
  async uploadAttachment(
    jobId: string,
    payload: {
      filename: string;
      mimeType: string;
      data: Buffer | string;
    }
  ): Promise<{ id: string; url: string }> {
    try {
      this.logger.log(`[JobNimbusClient] Uploading attachment for job: ${jobId}`);

      const form = new FormData();
      form.append('file', payload.data, {
        filename: payload.filename,
        contentType: payload.mimeType,
      });
      form.append('record_id', jobId);
      form.append('record_type', 'job');

      const response = await this.client.post('/files', form, {
        headers: form.getHeaders(),
      });

      this.logger.log(`[JobNimbusClient] Uploaded attachment: ${response.data.jnid}`);
      return {
        id: response.data.jnid,
        url: response.data.url || response.data.file_url,
      };
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error(`[JobNimbusClient] Error uploading attachment:`, jnError.message);
      throw jnError;
    }
  }

  /**
   * Update a job status in JobNimbus
   */
  async updateJobStatus(jobId: string, status: string): Promise<void> {
    try {
      this.logger.log(`[JobNimbusClient] Updating job status: ${jobId} to ${status}`);

      await this.client.put(`/jobs/${jobId}`, {
        status,
      });

      this.logger.log(`[JobNimbusClient] Updated job status successfully`);
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error(`[JobNimbusClient] Error updating job status:`, jnError.message);
      throw jnError;
    }
  }

  /**
   * Fetch attachments for a job
   */
  async fetchAttachments(
    jobId: string
  ): Promise<Array<{ id: string; fileName: string; url: string }>> {
    try {
      this.logger.log(`[JobNimbusClient] Fetching attachments for job: ${jobId}`);

      const response = await this.client.get(`/jobs/${jobId}/files`);

      const attachments = response.data.map((file: any) => ({
        id: file.jnid,
        fileName: file.filename || file.file_name,
        url: file.url || file.file_url,
      }));

      this.logger.log(`[JobNimbusClient] Fetched ${attachments.length} attachments`);
      return attachments;
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error(`[JobNimbusClient] Error fetching attachments:`, jnError.message);
      throw jnError;
    }
  }

  /**
   * Fetch photos/attachments for a job with enhanced metadata
   * Returns photos with tags, folders, and dates for classification
   */
  async fetchJobPhotos(jobId: string): Promise<JobNimbusPhoto[]> {
    try {
      this.logger.log(`[JobNimbusClient] Fetching photos for job: ${jobId}`);

      const response = await this.client.get(`/jobs/${jobId}/files`);

      const photos: JobNimbusPhoto[] = response.data.map((file: any) => ({
        id: file.jnid,
        jobId,
        url: file.url || file.file_url,
        filename: file.filename || file.file_name,
        mimeType: file.mime_type || file.content_type,
        takenAt: file.taken_at || file.created_date,
        uploadedAt: file.uploaded_at || file.created_date,
        tags: file.tags || [],
        folderName: file.folder_name || file.folder,
      }));

      this.logger.log(`[JobNimbusClient] Fetched ${photos.length} photos`);
      return photos;
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      this.logger.error(`[JobNimbusClient] Error fetching photos:`, jnError.message);
      throw jnError;
    }
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      // Try to fetch a small page of jobs as health check
      await this.client.get('/jobs', { params: { limit: 1 } });
      return { status: 'ok', message: 'JobNimbus API is accessible' };
    } catch (error) {
      const jnError = JobNimbusError.fromAxiosError(error);
      return {
        status: 'error',
        message: `JobNimbus API error: ${jnError.message}`,
      };
    }
  }
}

/**
 * Helper function to transform JobNimbus job to our domain model
 */
export function transformJobNimbusJob(jnJob: JobNimbusJob): Partial<Job> {
  return {
    jobNimbusId: jnJob.jnid,
    customerName: jnJob.display_name,
    address: jnJob.address || '',
    status: (jnJob.status_name || jnJob.status || 'LEAD') as Job['status'],
    assignedTo: jnJob.assigned_to,
    startDate: jnJob.start_date ? new Date(jnJob.start_date) : undefined,
    completionDate: jnJob.completion_date ? new Date(jnJob.completion_date) : undefined,
    systemSize: jnJob.system_size,
  };
}

/**
 * Helper function to transform JobNimbus contact to our domain model
 */
export function transformJobNimbusContact(jnContact: JobNimbusContact): Partial<Contact> {
  return {
    jobNimbusId: jnContact.jnid,
    name: jnContact.display_name,
    email: jnContact.email,
    phone: jnContact.phone,
    role: jnContact.role || 'Contact',
    isPrimary: jnContact.is_primary || false,
  };
}

export * from '@greenenergy/shared-types';
export { JobNimbusError } from './errors';
