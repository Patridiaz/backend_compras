import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = [
      'https://www.compras.eduhuechuraba.cl', // Por si acaso
      'http://localhost:4200', // <--- NECESARIO PARA EL DESARROLLO LOCAL
    ];

    app.enableCors({
      origin: allowedOrigins,
      allowedHeaders: 'Content-Type, Authorization',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true, // Si manejas cookies o tokens de autenticación
    });


  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  await app.listen(5000);
}
bootstrap();
