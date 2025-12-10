import { Module } from '@nestjs/common';
import { AiOperationsService } from './ai-operations.service';
import { AiOpsController } from './ai-ops.controller';

@Module({
  controllers: [AiOpsController],
  providers: [AiOperationsService],
  exports: [AiOperationsService],
})
export class AiOpsModule {}
