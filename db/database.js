const mysql = require('mysql2/promise');
const { createPool } = require('generic-pool');
const config = require('../scraper/config');

// Create a connection pool
const pool = createPool({
    create: async () => {
        const connection = await mysql.createConnection(config.dbConnection);
        return connection;
    },
    destroy: (connection) => {
        connection.end(); // Properly end the connection
    },
});

module.exports = {
    getConnection: async () => {
        const connection = await pool.acquire();
        return connection;
    },
    release: (connection) => {
        pool.release(connection);
    },
};