import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function setupDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to database.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                discord_id VARCHAR(255) NOT NULL UNIQUE,
                api_key VARCHAR(255) NOT NULL,
                notifications_enabled BOOLEAN DEFAULT 0,
                last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('`users` table is ready.');

        // Add columns if they don't exist
        const [columns] = await connection.execute("SHOW COLUMNS FROM `users` LIKE 'notifications_enabled'");
        if (columns.length === 0) {
            await connection.execute('ALTER TABLE `users` ADD `notifications_enabled` BOOLEAN DEFAULT 0');
            console.log('Added `notifications_enabled` column.');
        }

        const [lastCheckedColumns] = await connection.execute("SHOW COLUMNS FROM `users` LIKE 'last_checked'");
        if (lastCheckedColumns.length === 0) {
            await connection.execute('ALTER TABLE `users` ADD `last_checked` TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            console.log('Added `last_checked` column.');
        }
        
        connection.release();
    } catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();

export default pool;
