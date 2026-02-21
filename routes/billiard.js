const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL BILLIARD RECORDS =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM billiard ORDER BY date DESC, id DESC";

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);

    // Calculate totals for cards
    const totalCash = rows.reduce((sum, r) => sum + Number(r.cash || 0), 0);
    const totalMomo = rows.reduce((sum, r) => sum + Number(r.cash_momo || 0), 0);
    const totalTokens = rows.reduce((sum, r) => sum + Number(r.token || 0), 0);
    const totalSales = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);

    res.json({
      records: rows,
      totalCash,
      totalMomo,
      totalTokens,
      totalSales
    });
  });
});

// ================= ADD NEW RECORD =================
router.post("/", (req, res) => {
  const { date, token, cash, cash_momo } = req.body;

  if (!date)
    return res.status(400).json({ message: "Date is required" });

  const sql = `
    INSERT INTO billiard
    (date, token, cash, cash_momo)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      date,
      Number(token || 0),
      Number(cash || 0),
      Number(cash_momo || 0)
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Billiard record added", id: result.insertId });
    }
  );
});

// ================= UPDATE RECORD =================
router.put("/:id", (req, res) => {
  const { token, cash, cash_momo } = req.body;
  const { id } = req.params;

  const sql = `
    UPDATE billiard
    SET token=?, cash=?, cash_momo=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      Number(token || 0),
      Number(cash || 0),
      Number(cash_momo || 0),
      id
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Billiard record updated successfully" });
    }
  );
});

// ================= DELETE RECORD =================
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM billiard WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Billiard record deleted successfully" });
  });
});

module.exports = router;