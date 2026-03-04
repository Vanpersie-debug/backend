const express = require("express");
const router = express.Router();
const db = require("../db"); // your MySQL connection

// ================= GET ALL EMPLOYEES =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM employees ORDER BY id DESC";
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET EMPLOYEES ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch employees" });
    }
    res.json(rows);
  });
});

// ================= ADD NEW EMPLOYEE =================
router.post("/", (req, res) => {
  const { name, payment } = req.body;

  // Validate input
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  if (isNaN(payment)) return res.status(400).json({ error: "Payment must be a number" });

  // Insert into employees table
  const sql = "INSERT INTO employees (name, payment) VALUES (?, ?)";
  db.query(sql, [name.trim(), Number(payment)], (err, result) => {
    if (err) {
      console.error("INSERT EMPLOYEE ERROR:", err);
      return res.status(500).json({ error: "Failed to add employee" });
    }

    // Return the newly inserted employee
    db.query("SELECT * FROM employees WHERE id=?", [result.insertId], (err2, rows) => {
      if (err2) {
        console.error("FETCH NEW EMPLOYEE ERROR:", err2);
        return res.status(500).json({ error: "Failed to fetch new employee" });
      }
      res.json(rows[0]);
    });
  });
});

// ================= GET EMPLOYEE LOANS =================
router.get("/:id/loans", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM employee_loans WHERE employee_id=? ORDER BY loan_date DESC";
  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("GET LOANS ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch loans" });
    }
    res.json(rows);
  });
});

// ================= ADD NEW LOAN =================
router.post("/:id/loans", (req, res) => {
  const { id } = req.params;
  const { amount, reason, loan_date } = req.body;

  if (!loan_date || isNaN(Number(amount))) return res.status(400).json({ error: "Invalid loan data" });

  const insertSql = `
    INSERT INTO employee_loans (employee_id, amount, reason, loan_date, total_paid, remaining)
    VALUES (?, ?, ?, ?, 0, ?)
  `;
  db.query(insertSql, [id, Number(amount), reason || "", loan_date, Number(amount)], (err, result) => {
    if (err) {
      console.error("INSERT LOAN ERROR:", err);
      return res.status(500).json({ error: "Failed to add loan" });
    }

    // Update employee totals
    const updateEmployee = `
      UPDATE employees e
      SET credit = (SELECT IFNULL(SUM(amount),0) FROM employee_loans WHERE employee_id=?),
          remaining = (SELECT IFNULL(SUM(remaining),0) FROM employee_loans WHERE employee_id=?)
      WHERE id=?
    `;
    db.query(updateEmployee, [id, id, id], (err2) => {
      if (err2) {
        console.error("UPDATE EMPLOYEE TOTALS ERROR:", err2);
        return res.status(500).json({ error: "Failed to update employee totals" });
      }

      // Return the new loan
      db.query("SELECT * FROM employee_loans WHERE id=?", [result.insertId], (err3, rows) => {
        if (err3) {
          console.error("FETCH NEW LOAN ERROR:", err3);
          return res.status(500).json({ error: "Failed to fetch new loan" });
        }
        res.json(rows[0]);
      });
    });
  });
});

module.exports = router;