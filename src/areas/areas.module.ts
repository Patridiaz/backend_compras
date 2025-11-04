import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaRevisora } from './entities/area.entity';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';

@Module({
  imports: [TypeOrmModule.forFeature([AreaRevisora])],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [TypeOrmModule, AreasService],
})
export class AreasModule {}
