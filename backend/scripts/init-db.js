require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const rootConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: 'postgres'
};

const targetDb = process.env.DB_NAME || 'finsight_db';
const schemaPath = path.resolve(__dirname, '../database/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

async function main() {
  const client = new Client(rootConfig);
  await client.connect();

  try {
    const dbExists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );

    if (dbExists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`Created database: ${targetDb}`);
    } else {
      console.log(`Database already exists: ${targetDb}`);
    }
  } finally {
    await client.end();
  }

  const targetClient = new Client({
    ...rootConfig,
    database: targetDb,
  });

  await targetClient.connect();
  try {
    await targetClient.query(schemaSql);
    console.log(`Applied schema to: ${targetDb}`);
  } finally {
    await targetClient.end();
  }
}

main().catch((err) => {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
});
