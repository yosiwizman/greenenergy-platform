import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
