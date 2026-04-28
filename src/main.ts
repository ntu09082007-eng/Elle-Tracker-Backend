// 1. Ép hệ thống bỏ qua lỗi SSL khi kết nối Database (quan trọng cho Supabase)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; 
import * as dotenv from 'dotenv';

// 2. Nạp biến môi trường từ file .env
dotenv.config();

async function bootstrap() {
  console.log('--- 🔍 ĐANG SOI HỆ THỐNG ---');
  console.log('Link DB:', process.env.DB_URL ? '✅ ĐÃ THẤY' : '❌ KHÔNG THẤY (KIỂM TRA LẠI FILE .ENV)');
  console.log('Link API ELLE:', process.env.API_URL ? '✅ ĐÃ THẤY' : '❌ KHÔNG THẤY');

  const app = await NestFactory.create(AppModule);
  
  // 3. Cấu hình CORS "mở toang cửa" cho Frontend vào lấy số
  // Bước này cực kỳ quan trọng để Vercel lấy được data từ Render
  app.enableCors({
    origin: '*', // Cho phép tất cả mọi nơi truy cập
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log('-------------------------------------------');
  console.log(`🚀 SERVER ĐÃ "LÊN SÓNG" TẠI: http://localhost:${port}`);
  console.log('-------------------------------------------');
}

bootstrap();
