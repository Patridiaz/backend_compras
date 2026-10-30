import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3010;

  app.enableCors({
    origin: [
      'https://www.compras.axus.cl',
      'https://compras.axus.cl',
      'http://localhost:4200',
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
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor backend escuchando en el puerto ${port}`);
}

bootstrap();
