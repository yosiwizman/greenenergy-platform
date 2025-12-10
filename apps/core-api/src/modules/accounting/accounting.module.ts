import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { QuickbooksClient } from './quickbooks.client';

@Module({
  imports: [ConfigModule],
  controllers: [AccountingController],
  providers: [QuickbooksClient, AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
