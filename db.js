const fs = require("fs");
const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    ca: fs.readFileSync("./certs/ca.pem"),
  },
});

// Test connection
db.getConnection()
  .then((connection) => {
    console.log("✅ MySQL Connected to Aiven Cloud!");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ MySQL Error:", err.message);
  });

module.exports = db;


