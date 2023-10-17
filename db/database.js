const mysql = require('mysql2');
const config = require('../scraper/config');

// Create a MySQL database connection
const connection = mysql.createConnection(config.dbConnection);

// Connect to the database
connection.connect((error) => {
    if (error) {
        console.error('Error connecting to the MySQL database:', error);
    } else {
        console.log('Connected to the MySQL database.');
    }
});

module.exports = connection;