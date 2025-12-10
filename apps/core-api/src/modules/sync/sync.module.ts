import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { IntegrationController } from './integration.controller';
import { PhotoModule } from '../photo/photo.module';

@Module({
  imports: [PhotoModule],
  controllers: [SyncController, IntegrationController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
