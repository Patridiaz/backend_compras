import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = [
      'https://compras.eduhuechuraba.cl',
      'https://www.compras.eduhuechuraba.cl/',
      'http://localhost:4200/',
      'https://pc4h36xs-4200.brs.devtunnels.ms/' 
    ];

    app.enableCors({
      origin: true,
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
