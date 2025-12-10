import { Module } from '@nestjs/common';
 import { ConfigModule } from '@nestjs/config';
import { MaterialService } from './material.service';
import { MaterialController } from './material.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
