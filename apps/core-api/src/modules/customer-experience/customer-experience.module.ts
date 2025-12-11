import { Module } from '@nestjs/common';
import { CustomerExperienceService } from './customer-experience.service';
import { CustomerExperienceController } from './customer-experience.controller';
import { AiOpsModule } from '../ai-ops/ai-ops.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiOpsModule, NotificationsModule],
  providers: [CustomerExperienceService],
  controllers: [CustomerExperienceController],
  exports: [CustomerExperienceService],
})
export class CustomerExperienceModule {}
