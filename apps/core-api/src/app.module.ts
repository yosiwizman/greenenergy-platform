import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { JobModule } from './modules/job/job.module';
import { SyncModule } from './modules/sync/sync.module';
import { PhotoModule } from './modules/photo/photo.module';
import { QcModule } from './modules/qc/qc.module';
import { RiskModule } from './modules/risk/risk.module';
import { SubcontractorModule } from './modules/subcontractor/subcontractor.module';
import { SafetyModule } from './modules/safety/safety.module';
import { WarrantyModule } from './modules/warranty/warranty.module';
import { MaterialModule } from './modules/material/material.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { EmbedModule } from './modules/embed/embed.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    JobModule,
    SyncModule,
    PhotoModule,
    QcModule,
    RiskModule,
    SubcontractorModule,
    SafetyModule,
    WarrantyModule,
    MaterialModule,
    SchedulingModule,
    CustomerPortalModule,
    EmbedModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
