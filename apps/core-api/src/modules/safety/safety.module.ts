import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SafetyService } from './safety.service';
import { SafetyController } from './safety.controller';

@Module({
  imports: [ConfigModule],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
