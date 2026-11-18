import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Comma-separated, so the deployed web app and localhost can both call the API.
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
  });

  const swagger = new DocumentBuilder()
    .setTitle('Notes API')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, swagger),
  );

  await app.listen(config.get<number>('PORT', 3000));
}
await bootstrap();
