import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    database: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'e_commerce_whitelabel',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    app: {
      port: parseInt(process.env.PORT ?? '3000', 10),
    },
  };
});
