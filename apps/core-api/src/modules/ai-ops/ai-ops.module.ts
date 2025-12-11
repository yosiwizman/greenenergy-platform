import { Module } from '@nestjs/common';
import { AiOperationsService } from './ai-operations.service';
import { AiOpsController } from './ai-ops.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [AiOpsController],
  providers: [AiOperationsService],
  exports: [AiOperationsService],
})
export class AiOpsModule {}
