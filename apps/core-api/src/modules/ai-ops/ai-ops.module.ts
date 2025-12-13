import { Module } from '@nestjs/common';
import { AiOperationsService } from './ai-operations.service';
import { AiOpsController } from './ai-ops.controller';
import { LlmModule } from '../llm/llm.module';
import { LlmUsageModule } from '../llm-usage/llm-usage.module';

@Module({
  imports: [LlmModule, LlmUsageModule],
  controllers: [AiOpsController],
  providers: [AiOperationsService],
  exports: [AiOperationsService],
})
export class AiOpsModule {}
