import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // Configure CORS for customer portal
  const portalOrigin = process.env.PORTAL_ORIGIN || 'http://localhost:3001';
  app.enableCors({
    origin: [portalOrigin, 'http://localhost:3002'], // Allow customer portal and internal dashboard
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Core API is running on: http://localhost:${port}/api/v1`);
  console.log(`✅ CORS enabled for: ${portalOrigin}`);
}

bootstrap();
