const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL BILLIARD RECORDS =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM billiard ORDER BY date DESC, id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ================= ADD NEW RECORD =================
router.post("/", (req, res) => {
  const { date, token, cash, cash_momo } = req.body;

  if (!date || token == null || cash == null || cash_momo == null) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = `
    INSERT INTO billiard
    (date, token, cash, cash_momo)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [date, Number(token), Number(cash), Number(cash_momo)], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Billiard record added", id: result.insertId });
  });
});

module.exports = router;