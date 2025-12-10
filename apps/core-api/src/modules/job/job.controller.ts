import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { JobService } from './job.service';
import type { Prisma } from '@prisma/client';
import type { CreateJobDto, UpdateJobDto } from '@greenenergy/shared-types';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  async findAll() {
    return this.jobService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Prisma.JobGetPayload<{
    include: {
      contacts: true;
      photos: true;
      qcResults: true;
      riskFlags: true;
      warranties: true;
      materialOrders: true;
    };
  }> | null> {
    return this.jobService.findOne(id);
  }

  @Get(':id/photos')
  async getPhotos(@Param('id') id: string) {
    return this.jobService.getPhotos(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.jobService.getStatus(id);
  }

  @Get(':id/notes')
  async getNotes(@Param('id') id: string) {
    // TODO: Implement notes fetching from JobNimbus
    return {
      jobId: id,
      notes: [],
      message: 'Notes endpoint - to be implemented',
    };
  }

  @Post()
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(id, updateJobDto);
  }
}
