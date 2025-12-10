import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowTasks } from './workflow.tasks';

@Module({
  imports: [ConfigModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowTasks],
  exports: [WorkflowService],
})
export class WorkflowModule {}
