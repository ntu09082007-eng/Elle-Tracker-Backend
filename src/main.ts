// 1. Nạp dotenv đầu tiên
import * as dotenv from 'dotenv';
dotenv.config();

// 2. Ép hệ thống bỏ qua lỗi SSL cho Database
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; 

async function bootstrap() {
  console.log('--- 🔍 ĐANG SOI HỆ THỐNG ---');
  
  const app = await NestFactory.create(AppModule);
  
  // 3. FIX LỖI CORS "TẬN GỐC": 
  // Liệt kê đích danh các link Frontend của bà vào đây.
  app.enableCors({
    origin: [
      'https://elle-tracker.onrender.com',
      'https://ntu09082007-eng.onrender.com',
      'http://localhost:5173', // Cho phép cả máy cá nhân của bà để test cho sướng
    ], 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  
  const port = process.env.PORT || 3000;

  // 4. Lắng nghe trên 0.0.0.0 để Render thông nòng
  await app.listen(port, '0.0.0.0');
  
  console.log('-------------------------------------------');
  console.log(`🚀 SERVER ĐÃ "LÊN SÓNG" TẠI CỔNG: ${port}`);
  console.log('-------------------------------------------');
}

bootstrap();bootstrap();
