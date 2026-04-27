import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env.DB_URL,
    autoLoadEntities: true,
    synchronize: true, // Để nó tự tạo bảng cho bà luôn
    
    // ĐƯA SSL RA NGOÀI CÙNG CẤP VỚI url - CÁCH NÀY ĐÔ HƠN
    ssl: {
      rejectUnauthorized: false,
    },

    extra: {
      max: 3,
      connectionTimeoutMillis: 5000,
      // Vẫn giữ ở đây để đề phòng "kẻ hở"
      ssl: {
        rejectUnauthorized: false,
      },
    },
    migrations: [join(__dirname, '../..', 'migrations', '*.{js,ts}')],
    migrationsRun: false,
  }),
);
