import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PmeService } from './pme.service';
import { PmeController } from './pme.controller';
import { Pme } from './entities/pme.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pme])],
  controllers: [PmeController],
  providers: [PmeService],
  exports: [TypeOrmModule, PmeService],
})
export class PmeModule {}
