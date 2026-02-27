const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL EMPLOYEES =================
router.get("/", (req, res) => {
  const sql = `
    SELECT e.*,
      IFNULL(SUM(l.loan_amount),0) AS total_loan,
      IFNULL(SUM(l.paid_amount),0) AS total_paid,
      IFNULL(SUM(l.loan_amount - l.paid_amount),0) AS total_remaining
    FROM employees e
    LEFT JOIN employee_loans l ON e.id = l.employee_id
    GROUP BY e.id
    ORDER BY e.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// ================= ADD NEW EMPLOYEE =================
router.post("/", (req, res) => {
  const { name, monthly_salary } = req.body;

  if (!name) return res.status(400).json({ message: "Name is required" });

  db.query(
    "INSERT INTO employees (name, monthly_salary) VALUES (?, ?)",
    [name, Number(monthly_salary || 0)],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, name, monthly_salary });
    }
  );
});

// ================= GET LOANS OF ONE EMPLOYEE =================
router.get("/:id/loans", (req, res) => {
  db.query(
    "SELECT * FROM employee_loans WHERE employee_id=? ORDER BY id DESC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// ================= ADD LOAN TO EMPLOYEE =================
router.post("/:id/loans", (req, res) => {
  const { loan_amount } = req.body;

  db.query(
    "INSERT INTO employee_loans (employee_id, loan_amount) VALUES (?, ?)",
    [req.params.id, Number(loan_amount || 0)],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Loan added successfully" });
    }
  );
});

// ================= UPDATE LOAN PAYMENT =================
router.put("/loans/:loanId", (req, res) => {
  const { paid_amount } = req.body;

  db.query(
    "UPDATE employee_loans SET paid_amount=? WHERE id=?",
    [Number(paid_amount || 0), req.params.loanId],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Payment updated successfully" });
    }
  );
});

module.exports = router;