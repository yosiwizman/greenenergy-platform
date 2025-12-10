# @greenenergy/jobnimbus-sdk

JobNimbus API client and integration helpers for the Green Energy Platform.

## Overview

This package provides a typed API client wrapper for JobNimbus. It serves as the **single integration point** between our platform and JobNimbus.

## Features

- **Typed API client**: All methods are fully typed with TypeScript
- **Job sync**: Fetch jobs and contacts from JobNimbus
- **Write-back**: Create notes, tasks, and upload attachments to JobNimbus
- **Transformation helpers**: Convert JobNimbus data to our domain models

## Usage

```typescript
import { JobNimbusClient } from '@greenenergy/jobnimbus-sdk';

const client = new JobNimbusClient({
  baseUrl: process.env.JOBNIMBUS_API_URL,
  apiKey: process.env.JOBNIMBUS_API_KEY,
});

// Fetch jobs
const jobs = await client.fetchJobs({ status: 'active' });

// Create a note
await client.createNote('job-jnid', {
  jobId: 'internal-job-id',
  content: 'QC review complete',
  createdBy: 'system',
});
```

## Implementation Status

All methods currently throw "Not implemented" errors. Implementation will be completed during:

- **Phase 1, Sprint 1**: Sync engine foundation
- **Phase 1, Sprint 2**: Customer portal integration

## Methods

- `fetchJobs()` - Fetch all jobs with optional filtering
- `fetchJobById()` - Fetch a single job by JobNimbus ID
- `fetchContacts()` - Fetch contacts for a job
- `createNote()` - Create a note on a job
- `createTask()` - Create a task on a job
- `uploadAttachment()` - Upload a file attachment
- `updateJobStatus()` - Update job status
- `fetchAttachments()` - Fetch attachments for a job

## Transformation Helpers

- `transformJobNimbusJob()` - Convert JobNimbus job to our domain model
- `transformJobNimbusContact()` - Convert JobNimbus contact to our domain model
