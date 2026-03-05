const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL GYM RECORDS (FILTER BY DATE) =================
router.get("/", (req, res) => {
  const { date } = req.query;
  let sql = "SELECT * FROM gym";
  const params = [];

  if (date) {
    sql += " WHERE date = ?";
    params.push(date);
  }

  sql += " ORDER BY date DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json({ records: rows });
  });
});

// ================= ADD GYM RECORD =================
router.post("/", (req, res) => {
  let { date, daily_people, monthly_people, cash, cash_momo } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  daily_people = Number(daily_people || 0);
  monthly_people = Number(monthly_people || 0);
  cash = Number(cash || 0);
  cash_momo = Number(cash_momo || 0);
  const total_people = daily_people + monthly_people;

  const sql = `
    INSERT INTO gym
    (date, daily_people, monthly_people, total_people, cash, cash_momo)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [date, daily_people, monthly_people, total_people, cash, cash_momo], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Gym record added", id: result.insertId });
  });
});

// ================= UPDATE GYM RECORD =================
router.put("/:id", (req, res) => {
  const { id } = req.params;
  let { daily_people, monthly_people, cash, cash_momo } = req.body;

  daily_people = Number(daily_people || 0);
  monthly_people = Number(monthly_people || 0);
  cash = Number(cash || 0);
  cash_momo = Number(cash_momo || 0);
  const total_people = daily_people + monthly_people;

  const sql = `
    UPDATE gym
    SET daily_people=?, monthly_people=?, total_people=?, cash=?, cash_momo=?
    WHERE id=?
  `;
  db.query(sql, [daily_people, monthly_people, total_people, cash, cash_momo, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Gym record updated successfully" });
  });
});

// ================= DELETE GYM RECORD =================
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM gym WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Gym record deleted successfully" });
  });
});

module.exports = router;