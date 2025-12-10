import { Injectable } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import type { Prisma } from '@prisma/client';
import type { CreateJobDto, UpdateJobDto } from '@greenenergy/shared-types';

@Injectable()
export class JobService {
  async findAll() {
    return prisma.job.findMany({
      include: {
        contacts: true,
        riskFlags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(
    id: string,
  ): Promise<Prisma.JobGetPayload<{
    include: {
      contacts: true;
      photos: true;
      qcResults: true;
      riskFlags: true;
      warranties: true;
      materialOrders: true;
    };
  }> | null> {
    return prisma.job.findUnique({
      where: { id },
      include: {
        contacts: true,
        photos: true,
        qcResults: true,
        riskFlags: true,
        warranties: true,
        materialOrders: true,
      },
    });
  }

  async getPhotos(id: string) {
    return prisma.photoMetadata.findMany({
      where: { jobId: id },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  }

  async getStatus(id: string) {
    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startDate: true,
        completionDate: true,
      },
    });

    return {
      ...job,
      message: 'Job status retrieved successfully',
    };
  }

  async create(createJobDto: CreateJobDto) {
    return prisma.job.create({
      data: {
        customerName: createJobDto.customerName,
        address: createJobDto.address,
        status: createJobDto.status || 'LEAD',
        assignedTo: createJobDto.assignedTo,
        systemSize: createJobDto.systemSize,
      },
    });
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    return prisma.job.update({
      where: { id },
      data: updateJobDto,
    });
  }
}
