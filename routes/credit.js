const express = require("express");
const router = express.Router();
const db = require("../db"); // MySQL connection

// ================= GET ALL EMPLOYEES =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM employees ORDER BY id DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// ================= ADD NEW EMPLOYEE =================
router.post("/", (req, res) => {
  const { name, payment } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  const sql = "INSERT INTO employees (name, payment, credit) VALUES (?, ?, 0)";
  db.query(sql, [name, Number(payment || 0)], (err, result) => {
    if (err) return res.status(500).json(err);
    db.query("SELECT * FROM employees WHERE id=?", [result.insertId], (err2, rows) => {
      if (err2) return res.status(500).json(err2);
      res.json(rows[0]);
    });
  });
});

// ================= GET EMPLOYEE LOANS =================
router.get("/:id/loans", (req, res) => {
  const { id } = req.params;
  db.query(
    "SELECT * FROM employee_loans WHERE employee_id=? ORDER BY loan_date DESC",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// ================= ADD NEW LOAN =================
router.post("/:id/loans", (req, res) => {
  const { id } = req.params;
  const { amount, reason, loan_date } = req.body;

  const insertSql =
    "INSERT INTO employee_loans (employee_id, amount, reason, loan_date, total_paid, remaining) VALUES (?, ?, ?, ?, 0, ?)";
  db.query(insertSql, [id, Number(amount || 0), reason || "", loan_date, Number(amount || 0)], (err, result) => {
    if (err) return res.status(500).json(err);

    // Update employee total_loan and total_remaining
    const updateEmployee = `
      UPDATE employees e
      SET credit = (SELECT IFNULL(SUM(amount),0) FROM employee_loans WHERE employee_id=?),
          remaining = (SELECT IFNULL(SUM(remaining),0) FROM employee_loans WHERE employee_id=?)
      WHERE id=?
    `;
    db.query(updateEmployee, [id, id, id], (err2) => {
      if (err2) return res.status(500).json(err2);
      db.query("SELECT * FROM employee_loans WHERE id=?", [result.insertId], (err3, rows) => {
        if (err3) return res.status(500).json(err3);
        res.json(rows[0]);
      });
    });
  });
});

module.exports = router;