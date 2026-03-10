const express = require("express");
const router = express.Router();
const db = require("../db"); // your MySQL connection
const verifyToken = require("../middleware/AuthMiddlewares");
const allowRoles = require("../middleware/roleMiddleware");
const logActivity = require("../utils/activityLogger");

// ===== GET ALL EMPLOYEES W/ LOANS =====
router.get("/", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      c.id, 
      c.name, 
      c.payment, 
      c.created_at,
      IFNULL(SUM(l.amount), 0) AS total_loan,
      IFNULL(SUM(l.remaining), 0) AS total_remaining
    FROM credits c
    LEFT JOIN employee_loans l ON c.id = l.employee_id
    GROUP BY c.id
    ORDER BY c.id DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch employees" });
    res.json(rows);
  });
});

// ===== ADD NEW EMPLOYEE =====
router.post("/", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { name, payment } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  if (payment === undefined || isNaN(Number(payment))) return res.status(400).json({ error: "Payment must be a valid number" });

  const sql = "INSERT INTO credits (name, payment) VALUES (?, ?)";
  db.query(sql, [name.trim(), Number(payment)], (err, result) => {
    if (err) {
      console.error("INSERT EMPLOYEE ERROR:", err);
      return res.status(500).json({ error: "Failed to add employee" });
    }

    // Return the newly inserted employee
    db.query("SELECT * FROM credits WHERE id=?", [result.insertId], (err2, rows) => {
      if (err2) return res.status(500).json({ error: "Failed to fetch new employee" });

      logActivity({
        userId: req.user.userId,
        username: req.user.username,
        action: `Added new EMPLOYEE: ${name}`,
        page: "CREDITS",
        branch_id: req.user.branch_id,
        ip: req.ip
      });

      res.json(rows[0]);
    });
  });
});

// ===== DELETE EXISTING EMPLOYEE =====
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM credits WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Failed to delete employee" });
    
    logActivity({
      userId: req.user.userId,
      username: req.user.username,
      action: `Deleted EMPLOYEE ID: ${id}`,
      page: "CREDITS",
      branch_id: req.user.branch_id,
      ip: req.ip
    });

    res.json({ message: "Employee deleted successfully" });
  });
});

// ===== GET EMPLOYEE LOANS =====
router.get("/:id/loans", verifyToken, (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM employee_loans WHERE employee_id=? ORDER BY id DESC";
  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch loans" });
    res.json(rows);
  });
});

// ===== ADD EMPLOYEE LOAN =====
router.post("/:id/loans", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { id } = req.params;
  const { amount, reason, loan_date } = req.body;

  if (!amount || isNaN(Number(amount))) return res.status(400).json({ error: "Valid amount is required" });

  const numAmount = Number(amount);
  const sql = "INSERT INTO employee_loans (employee_id, amount, reason, loan_date, total_paid, remaining) VALUES (?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [id, numAmount, reason || "", loan_date, 0, numAmount], (err, result) => {
    if (err) {
      console.error("LOAN INSERT ERROR:", err);
      return res.status(500).json({ error: "Failed to add loan", details: err.message });
    }

    db.query("SELECT * FROM employee_loans WHERE id=?", [result.insertId], (err2, rows) => {
      if (err2) return res.status(500).json({ error: "Failed to fetch new loan" });

      logActivity({
        userId: req.user.userId,
        username: req.user.username,
        action: `Added LOAN: ${amount} for Employee ID: ${id}`,
        page: "CREDITS",
        branch_id: req.user.branch_id,
        ip: req.ip
      });

      res.json(rows[0]);
    });
  });
});

// ===== DELETE EMPLOYEE LOAN =====
router.delete("/:id/loans/:loanId", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { loanId } = req.params;
  db.query("DELETE FROM employee_loans WHERE id=?", [loanId], (err) => {
    if (err) return res.status(500).json({ error: "Failed to delete loan" });
    
    logActivity({
      userId: req.user.userId,
      username: req.user.username,
      action: `Deleted LOAN ID: ${loanId}`,
      page: "CREDITS",
      branch_id: req.user.branch_id,
      ip: req.ip
    });

    res.json({ message: "Loan deleted successfully" });
  });
});

// ===== PAY EMPLOYEE LOAN =====
router.put("/:id/loans/:loanId/pay", verifyToken, (req, res) => {
  const { loanId } = req.params;
  const { paymentAmount } = req.body;

  if (!paymentAmount || isNaN(Number(paymentAmount))) {
    return res.status(400).json({ error: "Valid payment amount is required" });
  }

  const amount = Number(paymentAmount);

  // 1. Check if record is locked
  db.query("SELECT is_locked, total_paid, remaining FROM employee_loans WHERE id=?", [loanId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch loan" });
    if (rows.length === 0) return res.status(404).json({ error: "Loan not found" });

    const loan = rows[0];
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (loan.is_locked && !isAdmin) {
      return res.status(403).json({ error: "This loan record is locked and cannot be edited by staff." });
    }

    const newTotalPaid = Number(loan.total_paid || 0) + amount;
    const newRemaining = Number(loan.remaining || 0) - amount;

    if (newRemaining < 0) {
      return res.status(400).json({ error: "Payment exceeds remaining balance" });
    }

    const newLockStatus = isAdmin ? loan.is_locked : 1;

    db.query(
      "UPDATE employee_loans SET total_paid=?, remaining=?, is_locked=? WHERE id=?",
      [newTotalPaid, newRemaining, newLockStatus, loanId],
      (err2) => {
        if (err2) return res.status(500).json({ error: "Failed to update loan" });

        db.query("SELECT * FROM employee_loans WHERE id=?", [loanId], (err3, updatedRows) => {
          if (err3) return res.status(500).json({ error: "Failed to fetch updated loan" });
          res.json(updatedRows[0]);
        });
      }
    );
  });
});

module.exports = router;