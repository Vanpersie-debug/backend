const express = require("express");
const router = express.Router();
const db = require("../db"); // your MySQL connection

// ===== GET ALL EMPLOYEES =====
router.get("/", (req, res) => {
  const sql = "SELECT * FROM credits ORDER BY id DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch employees" });
    res.json(rows);
  });
});

// ===== ADD NEW EMPLOYEE =====
router.post("/", (req, res) => {
  const { name, payment } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  if (payment === undefined || isNaN(Number(payment))) return res.status(400).json({ error: "Payment must be a valid number" });

  const sql = "INSERT INTO credits (name, payment) VALUES (?, ?)";
  db.query(sql, [name.trim(), Number(payment)], (err, result) => {
    if (err) {
      console.error("INSERT EMPLOYEE ERROR:", err);
      return res.status(500).json({ error: "Failed to add employee" });
    }

    // Return the newly inserted employee
    db.query("SELECT * FROM credits WHERE id=?", [result.insertId], (err2, rows) => {
      if (err2) return res.status(500).json({ error: "Failed to fetch new employee" });
      res.json(rows[0]);
    });
  });
});

module.exports = router;