import { Module } from '@nestjs/common';
import { LlmUsageController } from './llm-usage.controller';
import { LlmUsageService } from './llm-usage.service';

@Module({
  controllers: [LlmUsageController],
  providers: [LlmUsageService],
  exports: [LlmUsageService],
})
export class LlmUsageModule {}
