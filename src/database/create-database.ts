import { Client } from 'pg';

export async function ensureDatabaseExists() {
  const database = process.env.DATABASE_NAME;
  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;
  const port = parseInt(process.env.DATABASE_PORT || '');

  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  await client.connect();

  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname='${database}' `
  );

  if (res.rowCount === 0) {
    console.log(`📦 Database '${database}' não existe. Criando...`);

    await client.query(`CREATE DATABASE "${database}";`);
    console.log(`✅ Database '${database}' criado com sucesso!`);
  } else {
    console.log(`✔ Database '${database}' já existe.`);
  }

  await client.end();
}
