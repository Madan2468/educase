import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function init() {
  try {
    // Connect without specifying database first to create it
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    
    console.log("✅ Connected to MySQL successfully!");
    
    const sql = fs.readFileSync('./db/init.sql', 'utf8');
    const queries = sql.split(';').filter(q => q.trim());
    
    for (let q of queries) {
      await connection.query(q);
    }
    
    console.log("✅ Database and table initialized successfully.");
    await connection.end();
  } catch (err) {
    console.error("❌ Database connection failed:");
    console.error(err.message);
  }
}

init();
