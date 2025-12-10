import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbedService } from './embed.service';
import { EmbedController } from './embed.controller';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

@Module({
  imports: [ConfigModule],
  controllers: [EmbedController],
  providers: [EmbedService, InternalApiKeyGuard],
  exports: [EmbedService],
})
export class EmbedModule {}
