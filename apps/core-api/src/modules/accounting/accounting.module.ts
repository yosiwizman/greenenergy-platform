import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { QuickbooksClient } from './quickbooks.client';
import { QuickbooksAuthService } from './quickbooks-auth.service';
import { AccountingTasks } from './accounting.tasks';

@Module({
  imports: [ConfigModule],
  controllers: [AccountingController],
  providers: [
    QuickbooksAuthService,
    QuickbooksClient,
    AccountingService,
    AccountingTasks,
  ],
  exports: [AccountingService],
})
export class AccountingModule {}
