import { Module } from '@nestjs/common';
import { ProfitabilityService } from './profitability.service';
import { ProfitabilityController } from './profitability.controller';

@Module({
  controllers: [ProfitabilityController],
  providers: [ProfitabilityService],
  exports: [ProfitabilityService],
})
export class ProfitabilityModule {}
