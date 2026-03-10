const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/AuthMiddlewares");
const allowRoles = require("../middleware/roleMiddleware");
const logActivity = require("../utils/activityLogger");

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
router.put("/:id", verifyToken, (req, res) => {
  const { expense_name, amount, cost, date, category, is_profit } = req.body;
  const { id } = req.params;

  // 1. Check if record is locked
  db.query("SELECT is_locked FROM expenses WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Not found" });

    const isLocked = rows[0].is_locked;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (isLocked && !isAdmin) {
      return res.status(403).json({ message: "Record is locked and cannot be edited by staff." });
    }

    const newLockStatus = isAdmin ? isLocked : 1;

    const sql = `
      UPDATE expenses 
      SET expense_name=?, amount=?, cost=?, date=?, category=?, is_profit=?, is_locked=?
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
        newLockStatus,
        id
      ],
      (err2) => {
        if (err2) return res.status(500).json(err2);
        res.json({ message: "Expense updated successfully", is_locked: newLockStatus });
      }
    );
  });
});

// ================= DELETE EXPENSE =================
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM expenses WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    
    logActivity({
      userId: req.user.userId,
      username: req.user.username,
      action: `Deleted EXPENSE record ID: ${id}`,
      page: "EXPENSES",
      branch_id: req.user.branch_id,
      ip: req.ip
    });

    res.json({ message: "Expense deleted successfully" });
  });
});

// ================= GET STATS - DAY, WEEK, MONTH, YEAR TOTALS =================
router.get("/stats/timePeriods", (req, res) => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  
  // FIXED: Monthly reset logic (exact 1st of current month)
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const monthStartStr = `${y}-${m}-01`;
  
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearStartStr = yearStart.toISOString().split("T")[0];

  db.query(
    "SELECT SUM(amount) AS total FROM expenses WHERE date = ?",
    [todayStr],
    (err1, dayResult) => {
      if (err1) return res.status(500).json(err1);
      const dayTotal = dayResult[0]?.total || 0;

      db.query(
        "SELECT SUM(amount) AS total FROM expenses WHERE date >= ? AND date <= ?",
        [weekStartStr, todayStr],
        (err2, weekResult) => {
          if (err2) return res.status(500).json(err2);
          const weekTotal = weekResult[0]?.total || 0;

          db.query(
            "SELECT SUM(amount) AS total FROM expenses WHERE date >= ? AND date <= ?",
            [monthStartStr, todayStr],
            (err3, monthResult) => {
              if (err3) return res.status(500).json(err3);
              const monthTotal = monthResult[0]?.total || 0;

              db.query(
                "SELECT SUM(amount) AS total FROM expenses WHERE date >= ? AND date <= ?",
                [yearStartStr, todayStr],
                (err4, yearResult) => {
                  if (err4) return res.status(500).json(err4);
                  const yearTotal = yearResult[0]?.total || 0;

                  res.json({
                    day: Number(dayTotal) || 0,
                    week: Number(weekTotal) || 0,
                    month: Number(monthTotal) || 0,
                    year: Number(yearTotal) || 0,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;