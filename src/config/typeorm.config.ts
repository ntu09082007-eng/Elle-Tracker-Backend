import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env.DB_URL,
    autoLoadEntities: true,
    synchronize: true, 
    
    // Cấu hình SSL để "vượt rào" Supabase
    ssl: {
      rejectUnauthorized: false,
    },

    extra: {
      max: 3,
      connectionTimeoutMillis: 5000,
      ssl: {
        rejectUnauthorized: false,
      },
    },
    migrations: [join(__dirname, '../..', 'migrations', '*.{js,ts}')],
    migrationsRun: false,
  }),
);
