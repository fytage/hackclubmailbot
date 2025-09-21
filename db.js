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
        const columns = [
            { name: 'notifications_enabled', type: 'BOOLEAN DEFAULT 0' },
            { name: 'last_checked', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
            { name: 'notify_new_letter', type: 'BOOLEAN DEFAULT 1' },
            { name: 'notify_letter_update', type: 'BOOLEAN DEFAULT 1' },
            { name: 'notify_new_package', type: 'BOOLEAN DEFAULT 1' },
            { name: 'notify_package_update', type: 'BOOLEAN DEFAULT 1' }
        ];

        for (const col of columns) {
            const [columnExists] = await connection.execute(`SHOW COLUMNS FROM \`users\` LIKE '${col.name}'`);
            if (columnExists.length === 0) {
                await connection.execute(`ALTER TABLE \`users\` ADD \`${col.name}\` ${col.type}`);
                console.log(`Added \`${col.name}\` column.`);
            }
        }
        
        connection.release();
    } catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();

export default pool;
