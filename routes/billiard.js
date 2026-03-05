const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL RECORDS =================
router.get("/", (req, res) => {
  const { date } = req.query;
  let sql = "SELECT * FROM billiard";
  const params = [];

  if (date) {
    sql += " WHERE date = ?";
    params.push(date);
  }

  sql += " ORDER BY id DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);

    // Calculate total dynamically
    const dataWithTotal = rows.map((r) => ({
      ...r,
      total: Number(r.token || 0) + Number(r.cash || 0) + Number(r.cash_momo || 0)
    }));

    res.json(dataWithTotal);
  });
});

// ================= ADD RECORD =================
router.post("/", (req, res) => {
  const { date, token, cash, cash_momo } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  const sql = "INSERT INTO billiard (date, token, cash, cash_momo) VALUES (?, ?, ?, ?)";

  db.query(
    sql,
    [date, Number(token || 0), Number(cash || 0), Number(cash_momo || 0)],
    (err, result) => {
      if (err) return res.status(500).json(err);

      db.query("SELECT * FROM billiard WHERE id = ?", [result.insertId], (err2, rows) => {
        if (err2) return res.status(500).json(err2);

        const row = rows[0];
        row.total = Number(row.token || 0) + Number(row.cash || 0) + Number(row.cash_momo || 0);
        res.json(row);
      });
    }
  );
});

// ================= UPDATE RECORD =================
router.put("/:id", (req, res) => {
  const { token, cash, cash_momo } = req.body;
  const { id } = req.params;

  const sql = "UPDATE billiard SET token=?, cash=?, cash_momo=? WHERE id=?";

  db.query(sql, [Number(token || 0), Number(cash || 0), Number(cash_momo || 0), id], (err) => {
    if (err) return res.status(500).json(err);

    db.query("SELECT * FROM billiard WHERE id = ?", [id], (err2, rows) => {
      if (err2) return res.status(500).json(err2);

      const row = rows[0];
      row.total = Number(row.token || 0) + Number(row.cash || 0) + Number(row.cash_momo || 0);
      res.json(row);
    });
  });
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