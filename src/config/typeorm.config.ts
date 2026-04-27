// src/config/typeorm.config.ts
export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env.DB_URL,
    autoLoadEntities: true,
    synchronize: true, 
    // ĐƯA SSL RA NGOÀI VÀ THỬ CÁCH VIẾT KHÁC
    ssl: {
      rejectUnauthorized: false
    },
    extra: {
      max: 3,
      connectionTimeoutMillis: 5000,
      // Đảm bảo trong này không còn dòng ssl nào khác để tránh xung đột
    },
  }),
);
