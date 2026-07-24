import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [
      'https://www.compras.eduhuechuraba.cl',
      'https://compras.eduhuechuraba.cl',
      'http://localhost:4200'
    ],
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  await app.listen(process.env.PORT ?? 1433, '0.0.0.0');
}

bootstrap();
