import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowTasks } from './workflow.tasks';
import { CustomerExperienceModule } from '../customer-experience/customer-experience.module';

@Module({
  imports: [ConfigModule, CustomerExperienceModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowTasks],
  exports: [WorkflowService],
})
export class WorkflowModule {}
