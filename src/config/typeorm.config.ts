// src/config/typeorm.config.ts
export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    // TÁCH NHỎ CÁC THÔNG SỐ ĐỂ ÉP NHẬN SSL
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    synchronize: true, 
    ssl: { rejectUnauthorized: false }, 
    extra: {
      max: 3,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    },
  }),
);
