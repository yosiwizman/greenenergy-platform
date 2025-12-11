import { Module } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { SmsNotificationService } from './sms-notification.service';

@Module({
  providers: [EmailNotificationService, SmsNotificationService],
  exports: [EmailNotificationService, SmsNotificationService],
})
export class NotificationsModule {}
