const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL GYM RECORDS =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM gym ORDER BY date DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);

    // Calculate totals for frontend cards
    const totalCash = rows.reduce((sum, r) => sum + Number(r.cash || 0), 0);
    const totalMomo = rows.reduce((sum, r) => sum + Number(r.cash_momo || 0), 0);
    const totalPeople = rows.reduce((sum, r) => sum + Number(r.total_people || 0), 0);

    res.json({
      records: rows,
      totalCash,
      totalMomo,
      totalPeople,
    });
  });
});

// ================= ADD GYM RECORD =================
router.post("/", (req, res) => {
  const { date, daily_people, monthly_people, total_people, cash, cash_momo } = req.body;

  if (!date)
    return res.status(400).json({ message: "Date is required" });

  const sql = `
    INSERT INTO gym
    (date, daily_people, monthly_people, total_people, cash, cash_momo)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      date,
      Number(daily_people || 0),
      Number(monthly_people || 0),
      Number(total_people || 0),
      Number(cash || 0),
      Number(cash_momo || 0),
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Gym record added", id: result.insertId });
    }
  );
});

// ================= UPDATE GYM RECORD =================
router.put("/:id", (req, res) => {
  const { daily_people, monthly_people, total_people, cash, cash_momo } = req.body;
  const { id } = req.params;

  const sql = `
    UPDATE gym
    SET daily_people=?, monthly_people=?, total_people=?, cash=?, cash_momo=?
    WHERE id=?
  `;
  db.query(
    sql,
    [
      Number(daily_people || 0),
      Number(monthly_people || 0),
      Number(total_people || 0),
      Number(cash || 0),
      Number(cash_momo || 0),
      id,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Gym record updated successfully" });
    }
  );
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