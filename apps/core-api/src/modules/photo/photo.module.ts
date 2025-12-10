import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PhotoService } from './photo.service';

@Module({
  imports: [ConfigModule],
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotoModule {}
