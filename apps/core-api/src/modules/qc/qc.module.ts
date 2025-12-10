import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QCService } from './qc.service';
import { QcController } from './qc.controller';

@Module({
  imports: [ConfigModule],
  controllers: [QcController],
  providers: [QCService],
  exports: [QCService],
})
export class QcModule {}
