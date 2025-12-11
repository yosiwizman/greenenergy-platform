import { Module } from '@nestjs/common';
import { ExecutiveReportService } from './executive-report.service';
import { ExecutiveReportController } from './executive-report.controller';
import { FinanceModule } from '../finance/finance.module';
import { ForecastModule } from '../forecast/forecast.module';
import { CommandCenterModule } from '../command-center/command-center.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    FinanceModule,
    ForecastModule,
    CommandCenterModule,
    WorkflowModule,
    NotificationsModule,
  ],
  providers: [ExecutiveReportService],
  controllers: [ExecutiveReportController],
  exports: [ExecutiveReportService],
})
export class ExecutiveReportModule {}
