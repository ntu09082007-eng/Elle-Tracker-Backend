import * as dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: [
      'https://elle-tracker.onrender.com',
      'https://ntu09082007-eng.onrender.com',
      'http://localhost:5173', 
    ], 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log('--- 🔍 HỆ THỐNG ĐÃ SẠCH SẼ ---');
  console.log(`🚀 Link API: https://elle-tracker-backend.onrender.com/realtime`);
}

bootstrap(); // ĐÚNG 1 CÁI NÀY LÀ ĐỦ RỒI NHA!
