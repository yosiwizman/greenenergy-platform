import { Module } from '@nestjs/common';
import { CommandCenterService } from './command-center.service';
import { CommandCenterController } from './command-center.controller';

@Module({
  providers: [CommandCenterService],
  controllers: [CommandCenterController],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
