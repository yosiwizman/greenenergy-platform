import { Module } from '@nestjs/common';
import { OpsStatusService } from './ops-status.service';
import { OpsStatusController } from './ops-status.controller';

/**
 * Module that provides platform operations status monitoring.
 */
@Module({
  controllers: [OpsStatusController],
  providers: [OpsStatusService],
  exports: [OpsStatusService],
})
export class OpsStatusModule {}
