// 1. Phải chạy dotenv đầu tiên để đảm bảo mọi biến môi trường được nạp ngay lập tức
import * as dotenv from 'dotenv';
dotenv.config();

// 2. Ép hệ thống bỏ qua lỗi SSL cho Database
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; 

async function bootstrap() {
  console.log('--- 🔍 ĐANG SOI HỆ THỐNG ---');
  console.log('Link DB:', process.env.DB_URL ? '✅ ĐÃ THẤY' : '❌ KHÔNG THẤY (KIỂM TRA LẠI FILE .ENV)');
  console.log('Link API ELLE:', process.env.API_URL ? '✅ ĐÃ THẤY' : '❌ KHÔNG THẤY');

  const app = await NestFactory.create(AppModule);
  
  // 3. FIX LỖI CORS: Khi dùng credentials: true, KHÔNG ĐƯỢC dùng origin: '*'
  // Tui đổi thành origin: true để nó tự động chấp nhận link từ Frontend của bà
  app.enableCors({
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;

  // 4. FIX LỖI RENDER: Lắng nghe trên 0.0.0.0 để "thông nòng" với thế giới bên ngoài
  await app.listen(port, '0.0.0.0');
  
  console.log('-------------------------------------------');
  console.log(`🚀 SERVER ĐÃ "LÊN SÓNG" TẠI CỔNG: ${port}`);
  console.log(`👉 Link API của bà: https://elle-tracker-backend.onrender.com/realtime`);
  console.log('-------------------------------------------');
}

bootstrap();
