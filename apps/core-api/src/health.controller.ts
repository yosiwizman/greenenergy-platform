import { Controller, Get } from '@nestjs/common';
import { prisma } from '@greenenergy/db';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'core-api',
    };
  }

  @Get('phase-1')
  async phase1Summary() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count jobs
    const totalJobs = await prisma.job.count();
    const recentJobs = await prisma.job.count({
      where: { createdAt: { gte: last24h } },
    });

    // Count QC checks
    const totalQCChecks = await prisma.qCPhotoCheck.count();
    const recentQCChecks = await prisma.qCPhotoCheck.count({
      where: { checkedAt: { gte: last24h } },
    });
    const failedQCChecks = await prisma.qCPhotoCheck.count({
      where: { status: 'FAIL' },
    });

    // Count risk snapshots
    const totalRiskSnapshots = await prisma.jobRiskSnapshot.count();
    const recentRiskSnapshots = await prisma.jobRiskSnapshot.count({
      where: { riskComputedAt: { gte: last24h } },
    });
    const highRiskJobs = await prisma.jobRiskSnapshot.count({
      where: { riskLevel: 'HIGH' },
    });

    // Count portal sessions
    const totalPortalSessions = await prisma.portalSession.count();
    const recentPortalSessions = await prisma.portalSession.count({
      where: { createdAt: { gte: last24h } },
    });

    return {
      status: 'ok',
      timestamp: now.toISOString(),
      phase: 'Phase 1',
      version: '1.0.0',
      summary: {
        jobs: {
          total: totalJobs,
          last24h: recentJobs,
        },
        qc: {
          totalChecks: totalQCChecks,
          checksLast24h: recentQCChecks,
          failedChecks: failedQCChecks,
        },
        risk: {
          totalSnapshots: totalRiskSnapshots,
          snapshotsLast24h: recentRiskSnapshots,
          highRiskJobs,
        },
        portal: {
          totalSessions: totalPortalSessions,
          sessionsLast24h: recentPortalSessions,
        },
      },
    };
  }
}
