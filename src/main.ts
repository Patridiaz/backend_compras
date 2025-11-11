import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({});

  // Sirve archivos estáticos desde la carpeta 'uploads'
  // Ahora, un archivo en 'uploads/nombre-archivo.pdf' será accesible en
  // http://localhost:3000/uploads/nombre-archivo.pdf
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  await app.listen(5000);
}
bootstrap();
