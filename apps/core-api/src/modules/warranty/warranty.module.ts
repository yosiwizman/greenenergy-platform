import { Module } from '@nestjs/common';
 import { ConfigModule } from '@nestjs/config';
import { WarrantyService } from './warranty.service';
import { WarrantyController } from './warranty.controller';
import { WarrantyTasks } from './warranty.tasks';

@Module({
  imports: [ConfigModule],
  controllers: [WarrantyController],
  providers: [WarrantyService, WarrantyTasks],
  exports: [WarrantyService],
})
export class WarrantyModule {}
