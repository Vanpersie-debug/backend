const express = require("express");
const router = express.Router();
const db = require("../db");

// =====================================================
// HELPER FUNCTION – CALCULATE VALUES
// =====================================================
function processAndReturn(rows, res) {
  const products = rows.map((p) => {
    const opening_stock = Number(p.opening_stock) || 0;
    const entree = Number(p.entree) || 0;
    const sold = Number(p.sold) || 0;
    const price = Number(p.price) || 0;
    const initial_price = Number(p.initial_price) || 0;

    const total_stock = opening_stock + entree;
    const closing_stock = Math.max(total_stock - sold, 0);
    const total_sold = sold * price;
    const profit = sold * (price - initial_price);

    return {
      ...p,
      total_stock,
      closing_stock,
      total_sold,
      profit,
    };
  });

  const totalEarned = products.reduce(
    (sum, p) => sum + p.total_sold,
    0
  );

  res.json({ products, totalEarned });
}

// =====================================================
// GET PRODUCTS BY DATE
// AUTO CREATE NEXT DAY FROM YESTERDAY CLOSING
// =====================================================
router.get("/", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  // 1️⃣ Check if date already exists
  db.query(
    "SELECT * FROM bar_products WHERE date = ? ORDER BY id DESC",
    [date],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      if (rows.length > 0) {
        return processAndReturn(rows, res);
      }

      // 2️⃣ Get yesterday
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split("T")[0];

      db.query(
        "SELECT * FROM bar_products WHERE date = ?",
        [yDate],
        (err2, yesterdayRows) => {
          if (err2) return res.status(500).json(err2);

          if (yesterdayRows.length === 0) {
            return res.json({ products: [], totalEarned: 0 });
          }

          // 3️⃣ Create new day from yesterday closing
          const insertValues = yesterdayRows.map((p) => {
            const closing_stock =
              (Number(p.opening_stock) || 0) +
              (Number(p.entree) || 0) -
              (Number(p.sold) || 0);

            return [
              p.name,
              Number(p.initial_price) || 0,
              Number(p.price) || 0,
              closing_stock > 0 ? closing_stock : 0,
              0,
              0,
              date,
            ];
          });

          db.query(
            `INSERT INTO bar_products
             (name, initial_price, price, opening_stock, entree, sold, date)
             VALUES ?`,
            [insertValues],
            (err3) => {
              if (err3) return res.status(500).json(err3);

              db.query(
                "SELECT * FROM bar_products WHERE date = ? ORDER BY id DESC",
                [date],
                (err4, newRows) => {
                  if (err4) return res.status(500).json(err4);
                  processAndReturn(newRows, res);
                }
              );
            }
          );
        }
      );
    }
  );
});

// =====================================================
// ADD PRODUCT
// =====================================================
router.post("/", (req, res) => {
  const { name, initial_price, price, opening_stock, date } = req.body;

  if (!name || !date) {
    return res.status(400).json({ message: "Name and date required" });
  }

  db.query(
    `INSERT INTO bar_products
     (name, initial_price, price, opening_stock, entree, sold, date)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
    [
      name,
      Number(initial_price) || 0,
      Number(price) || 0,
      Number(opening_stock) || 0,
      date,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: "Product added successfully",
        id: result.insertId,
      });
    }
  );
});

// =====================================================
// UPDATE STOCK (ENTREE + SOLD)
// =====================================================
router.put("/stock/:id", (req, res) => {
  const { entree, sold, date } = req.body;
  const { id } = req.params;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  db.query(
    `UPDATE bar_products
     SET entree = ?, sold = ?
     WHERE id = ? AND date = ?`,
    [
      Number(entree) || 0,
      Number(sold) || 0,
      id,
      date,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Stock updated successfully" });
    }
  );
});

// =====================================================
// UPDATE PRICE ONLY
// =====================================================
router.put("/price/:id", (req, res) => {
  const { initial_price, price, date } = req.body;
  const { id } = req.params;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  db.query(
    `UPDATE bar_products
     SET initial_price = ?, price = ?
     WHERE id = ? AND date = ?`,
    [
      Number(initial_price) || 0,
      Number(price) || 0,
      id,
      date,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Price updated successfully" });
    }
  );
});

// =====================================================
// EDIT PRODUCT (NAME + COST + SELLING + OPENING STOCK)
// =====================================================
router.put("/edit/:id", (req, res) => {
  const { name, initial_price, price, opening_stock, date } = req.body;
  const { id } = req.params;

  if (!name || !date) {
    return res.status(400).json({ message: "Name and date required" });
  }

  db.query(
    `UPDATE bar_products
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
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM bar_products WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Product deleted successfully" });
  });
});

// =====================================================
// GET STATS - DAY, WEEK, MONTH, YEAR TOTALS
// =====================================================
router.get("/stats/timePeriods", (req, res) => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  // Week: last 7 days
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  
  // Month: current month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  
  // Year: current year
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearStartStr = yearStart.toISOString().split("T")[0];

  // Day total
  db.query(
    "SELECT SUM(sold * price) AS total FROM bar_products WHERE date = ?",
    [todayStr],
    (err1, dayResult) => {
      if (err1) return res.status(500).json(err1);
      const dayTotal = dayResult[0]?.total || 0;

      // Week total
      db.query(
        "SELECT SUM(sold * price) AS total FROM bar_products WHERE date >= ? AND date <= ?",
        [weekStartStr, todayStr],
        (err2, weekResult) => {
          if (err2) return res.status(500).json(err2);
          const weekTotal = weekResult[0]?.total || 0;

          // Month total
          db.query(
            "SELECT SUM(sold * price) AS total FROM bar_products WHERE date >= ? AND date <= ?",
            [monthStartStr, todayStr],
            (err3, monthResult) => {
              if (err3) return res.status(500).json(err3);
              const monthTotal = monthResult[0]?.total || 0;

              // Year total
              db.query(
                "SELECT SUM(sold * price) AS total FROM bar_products WHERE date >= ? AND date <= ?",
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