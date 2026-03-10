const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/AuthMiddlewares");
const allowRoles = require("../middleware/roleMiddleware");
const logActivity = require("../utils/activityLogger");


// ==================================================
// GET ALL PRODUCTS BY DATE
// ==================================================
router.get("/", verifyToken, (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  const sql = `
    SELECT * FROM kitchen_products
    WHERE date = ?
    ORDER BY id DESC
  `;

  db.query(sql, [date], (err, rows) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json(err);
    }

    const foods = rows.map((item) => {
      const cost = Number(item.initial_price) || 0;
      const price = Number(item.price) || 0;
      const opening_stock = Number(item.opening_stock) || 0;
      const entree = Number(item.entree) || 0;
      const sold = Number(item.sold) || 0;

      const total_stock = opening_stock + entree;
      const total_sold = sold * price;
      const profit = sold * (price - cost);
      const closing_stock = total_stock - sold;

      return {
        ...item,
        total_stock,
        total_sold,
        profit,
        closing_stock,
      };
    });

    const totalEarned = foods.reduce((sum, f) => sum + f.total_sold, 0);
    const totalProfit = foods.reduce((sum, f) => sum + f.profit, 0);
    const totalStockValue = foods.reduce(
      (sum, f) => sum + f.closing_stock * (Number(f.initial_price) || 0),
      0
    );
    const lowStockCount = foods.filter((f) => f.closing_stock < 5).length;

    res.json({
      foods,
      totalEarned,
      totalProfit,
      totalStockValue,
      lowStockCount,
    });
  });
});


// ==================================================
// ADD NEW FOOD
// ==================================================
router.post("/", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { name, initial_price, price, opening_stock, date } = req.body;

  if (!name || !date) {
    return res.status(400).json({
      message: "Name and date are required",
    });
  }

  const sql = `
    INSERT INTO kitchen_products
    (name, initial_price, price, opening_stock, entree, sold, date)
    VALUES (?, ?, ?, ?, 0, 0, ?)
  `;

  db.query(
    sql,
    [
      name,
      Number(initial_price) || 0,
      Number(price) || 0,
      Number(opening_stock) || 0,
      date,
    ],
    (err, result) => {
      if (err) {
        console.error("Insert error:", err);
        return res.status(500).json(err);
      }

        logActivity({
          userId: req.user.userId,
          username: req.user.username,
          action: `Added new KITCHEN food: ${name}`,
          page: "KITCHEN",
          branch_id: req.user.branch_id,
          ip: req.ip
        });

        res.json({
          message: "Food added successfully",
          id: result.insertId,
        });
    }
  );
});


// ==================================================
// UPDATE ENTREE
// ==================================================
router.put("/entree/:id", verifyToken, (req, res) => {
  const { entree, date } = req.body;
  const { id } = req.params;

  if (entree == null || !date) {
    return res.status(400).json({
      message: "Entree and date are required",
    });
  }

  // 1. Check if record is locked
  db.query("SELECT is_locked FROM kitchen_products WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Not found" });

    const isLocked = rows[0].is_locked;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (isLocked && !isAdmin) {
      return res.status(403).json({ message: "Record is locked and cannot be edited by staff." });
    }

    const newLockStatus = isAdmin ? isLocked : 1;

    const sql = `
      UPDATE kitchen_products
      SET entree = ?, is_locked = ?
      WHERE id = ? AND date = ?
    `;

    db.query(sql, [Number(entree), newLockStatus, id, date], (err2) => {
      if (err2) {
        console.error("Entree update error:", err2);
        return res.status(500).json(err2);
      }

      res.json({ message: "Entree updated successfully", is_locked: newLockStatus });
    });
  });
});


// ==================================================
// UPDATE SOLD
// ==================================================
router.put("/sold/:id", verifyToken, (req, res) => {
  const { sold, date } = req.body;
  const { id } = req.params;

  if (sold == null || !date) {
    return res.status(400).json({
      message: "Sold and date are required",
    });
  }

  // 1. Check if record is locked
  db.query("SELECT is_locked FROM kitchen_products WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Not found" });

    const isLocked = rows[0].is_locked;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (isLocked && !isAdmin) {
      return res.status(403).json({ message: "Record is locked and cannot be edited by staff." });
    }

    const newLockStatus = isAdmin ? isLocked : 1;

    db.query("UPDATE kitchen_products SET sold = ?, is_locked = ? WHERE id = ? AND date = ?", [Number(sold), newLockStatus, id, date], (err2) => {
      if (err2) {
        console.error("Sold update error:", err2);
        return res.status(500).json(err2);
      }
      res.json({ message: "Sold updated successfully", is_locked: newLockStatus });
    });
  });
});


// =====================================================
// EDIT PRODUCT (NAME + COST + SELLING + OPENING STOCK)
// =====================================================
router.put("/edit/:id", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { name, initial_price, price, opening_stock, date } = req.body;
  const { id } = req.params;

  if (!name || !date) {
    return res.status(400).json({ message: "Name and date required" });
  }

  db.query(
    `UPDATE kitchen_products
     SET name = ?, 
         initial_price = ?, 
         price = ?, 
         opening_stock = ?
     WHERE id = ? AND date = ?`,
    [
      name,
      Number(initial_price) || 0,
      Number(price) || 0,
      Number(opening_stock) || 0,
      id,
      date,
    ],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Product updated successfully" });
    }
  );
});

// =====================================================
// DELETE PRODUCT
// =====================================================
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM kitchen_products WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json(err);
    
    logActivity({
      userId: req.user.userId,
      username: req.user.username,
      action: `Deleted KITCHEN product ID: ${id}`,
      page: "KITCHEN",
      branch_id: req.user.branch_id,
      ip: req.ip
    });

    res.json({ message: "Product deleted successfully" });
  });
});

// ==================================================
// GET STATS - DAY, WEEK, MONTH, YEAR TOTALS
// ==================================================
router.get("/stats/timePeriods", verifyToken, (req, res) => {
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
    "SELECT SUM(sold * price) AS total FROM kitchen_products WHERE date = ?",
    [todayStr],
    (err1, dayResult) => {
      if (err1) return res.status(500).json(err1);
      const dayTotal = dayResult[0]?.total || 0;

      db.query(
        "SELECT SUM(sold * price) AS total FROM kitchen_products WHERE date >= ? AND date <= ?",
        [weekStartStr, todayStr],
        (err2, weekResult) => {
          if (err2) return res.status(500).json(err2);
          const weekTotal = weekResult[0]?.total || 0;

          db.query(
            "SELECT SUM(sold * price) AS total FROM kitchen_products WHERE date >= ? AND date <= ?",
            [monthStartStr, todayStr],
            (err3, monthResult) => {
              if (err3) return res.status(500).json(err3);
              const monthTotal = monthResult[0]?.total || 0;

              db.query(
                "SELECT SUM(sold * price) AS total FROM kitchen_products WHERE date >= ? AND date <= ?",
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