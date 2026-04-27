// src/main.ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // ÉP HỆ THỐNG BỎ QUA SSL NGAY LẬP TỨC

import { NestFactory } from '@nestjs/core';
// ... các dòng còn lại giữ nguyên
import { AppModule } from './app.module'; // DÒNG NÀY ĐANG THIẾU NÈ
import * as dotenv from 'dotenv'; // Nạp dotenv để check log cho chuẩn

dotenv.config();

async function bootstrap() {
  console.log('--- 🔍 ĐANG SOI HỆ THỐNG ---');
  console.log('Link DB trong .env:', process.env.DB_URL ? '✅ ĐÃ THẤY' : '❌ KHÔNG THẤY (LỖI Ở FILE .ENV)');

  const app = await NestFactory.create(AppModule);
  
  // Giữ nguyên cấu hình của bro
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
}
bootstrap();
