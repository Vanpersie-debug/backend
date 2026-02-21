const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL EXPENSES =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM expenses ORDER BY date DESC, id DESC";

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);

    // Calculate totals for dashboard cards
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalCost = rows.reduce((sum, r) => sum + Number(r.cost || 0), 0);
    const totalProfit = rows.reduce(
      (sum, r) => sum + (Number(r.amount || 0) - Number(r.cost || 0)),
      0
    );

    const totalProfitable = rows.filter(r => r.is_profit === 1).length;
    const totalUnprofitable = rows.filter(r => r.is_profit === 0).length;

    res.json({
      records: rows,
      totalAmount,
      totalCost,
      totalProfit,
      totalProfitable,
      totalUnprofitable
    });
  });
});

// ================= ADD EXPENSE =================
router.post("/", (req, res) => {
  const { expense_name, amount, cost, date, category, is_profit } = req.body;

  if (!expense_name || !date || !category || is_profit === undefined) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  const sql = `
    INSERT INTO expenses 
    (expense_name, amount, cost, date, category, is_profit)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      expense_name,
      Number(amount || 0),
      Number(cost || 0),
      date,
      category,
      Number(is_profit)
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      // Return inserted row
      db.query(
        "SELECT * FROM expenses WHERE id = ?",
        [result.insertId],
        (err2, rows) => {
          if (err2) return res.status(500).json(err2);
          res.json(rows[0]);
        }
      );
    }
  );
});

// ================= UPDATE EXPENSE =================
router.put("/:id", (req, res) => {
  const { expense_name, amount, cost, date, category, is_profit } = req.body;
  const { id } = req.params;

  const sql = `
    UPDATE expenses 
    SET expense_name=?, amount=?, cost=?, date=?, category=?, is_profit=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      expense_name,
      Number(amount || 0),
      Number(cost || 0),
      date,
      category,
      Number(is_profit),
      id
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Expense updated successfully" });
    }
  );
});

// ================= DELETE EXPENSE =================
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM expenses WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Expense deleted successfully" });
  });
});

module.exports = router;