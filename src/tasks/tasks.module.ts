import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Necesario para la inyección de la conexión
import { TasksService } from './tasks.service';

@Module({
  imports: [
    // Si necesitas acceder a otras entidades en tus tareas, impórtalas aquí.
  ],
  providers: [TasksService], // 👈 Registrar el servicio
})
export class TasksModule {}