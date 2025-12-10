import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalController } from './customer-portal.controller';
import { WarrantyModule } from '../warranty/warranty.module';

@Module({
  imports: [ConfigModule, WarrantyModule],
  providers: [CustomerPortalService],
  controllers: [CustomerPortalController],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}
