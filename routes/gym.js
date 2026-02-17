const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL GYM RECORDS =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM gym ORDER BY date DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ================= ADD GYM RECORD =================
router.post("/", (req, res) => {
  const { date, daily_people, monthly_people, total_people, cash, cash_momo } = req.body;

  if (
    !date ||
    daily_people == null ||
    monthly_people == null ||
    total_people == null ||
    cash == null ||
    cash_momo == null
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = `
    INSERT INTO gym
    (date, daily_people, monthly_people, total_people, cash, cash_momo)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      date,
      Number(daily_people),
      Number(monthly_people),
      Number(total_people),
      Number(cash),
      Number(cash_momo),
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Gym record added", id: result.insertId });
    }
  );
});

module.exports = router;