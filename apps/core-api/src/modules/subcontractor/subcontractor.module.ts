import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubcontractorService } from './subcontractor.service';
import { SubcontractorController, JobSubcontractorController } from './subcontractor.controller';

@Module({
  imports: [ConfigModule],
  controllers: [SubcontractorController, JobSubcontractorController],
  providers: [SubcontractorService],
  exports: [SubcontractorService],
})
export class SubcontractorModule {}
