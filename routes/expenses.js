const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL EXPENSES =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM expenses ORDER BY date DESC, id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ================= ADD EXPENSE =================
router.post("/", (req, res) => {
  const { expense_name, amount, date, category, is_profit } = req.body;

  if (!expense_name || !amount || !date || !category || is_profit === undefined) {
    return res.status(400).json({ message: "All fields required" });
  }

  const sql =
    "INSERT INTO expenses (expense_name, amount, date, category, is_profit) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sql,
    [expense_name, amount, date, category, is_profit],
    (err, result) => {
      if (err) return res.status(500).json(err);

      // Return the inserted record so frontend can append it
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
  const { expense_name, amount, date, category, is_profit } = req.body;
  const { id } = req.params;

  if (!expense_name || !amount || !date || !category || is_profit === undefined) {
    return res.status(400).json({ message: "All fields required" });
  }

  const sql =
    "UPDATE expenses SET expense_name=?, amount=?, date=?, category=?, is_profit=? WHERE id=?";
  db.query(
    sql,
    [expense_name, amount, date, category, is_profit, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Expense updated" });
    }
  );
});

module.exports = router;