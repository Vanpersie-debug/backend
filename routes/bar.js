const express = require("express");
const router = express.Router();
const db = require("../db");

// =====================================================
// HELPER FUNCTION – Calculate and Return Data
// =====================================================
function processAndReturn(rows, res) {
  const products = rows.map((p) => {
    const total_stock = Number(p.opening_stock) + Number(p.entree);
    const closing_stock = Math.max(total_stock - Number(p.sold), 0);
    const total_sold = Number(p.sold) * Number(p.price);
    const profit =
      Number(p.sold) * (Number(p.price) - Number(p.initial_price));

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
// GET PRODUCTS BY DATE (SAFE ROLLOVER)
// =====================================================
router.get("/", async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  try {
    // 1️⃣ Check if date already exists
    db.query(
      "SELECT * FROM bar_products WHERE date = ? ORDER BY id DESC",
      [date],
      (err, rows) => {
        if (err) return res.status(500).json(err);

        if (rows.length > 0) {
          return processAndReturn(rows, res);
        }

        // 2️⃣ If no records → check previous day
        const previousDate = new Date(date);
        previousDate.setDate(previousDate.getDate() - 1);
        const prevFormatted =
          previousDate.toISOString().split("T")[0];

        db.query(
          "SELECT * FROM bar_products WHERE date = ?",
          [prevFormatted],
          (err, prevRows) => {
            if (err) return res.status(500).json(err);

            if (prevRows.length === 0) {
              return res.json({
                products: [],
                totalEarned: 0,
              });
            }

            // 3️⃣ Prepare rollover values
            const insertValues = prevRows.map((p) => {
              const total_stock =
                Number(p.opening_stock) + Number(p.entree);

              const closing_stock = Math.max(
                total_stock - Number(p.sold),
                0
              );

              return [
                p.name,
                p.initial_price,
                p.price,
                closing_stock,
                0,
                0,
                date,
              ];
            });

            // 4️⃣ Use INSERT IGNORE to prevent duplicates
            db.query(
              `INSERT IGNORE INTO bar_products
              (name, initial_price, price, opening_stock, entree, sold, date)
              VALUES ?`,
              [insertValues],
              (err) => {
                if (err) return res.status(500).json(err);

                // 5️⃣ Fetch new day's data
                db.query(
                  "SELECT * FROM bar_products WHERE date = ? ORDER BY id DESC",
                  [date],
                  (err, newRows) => {
                    if (err)
                      return res.status(500).json(err);

                    processAndReturn(newRows, res);
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// ADD PRODUCT
// =====================================================
router.post("/", (req, res) => {
  const { name, initial_price, price, opening_stock, date } =
    req.body;

  if (!name || !date) {
    return res
      .status(400)
      .json({ message: "Name and date required" });
  }

  db.query(
    `INSERT INTO bar_products
     (name, initial_price, price, opening_stock, entree, sold, date)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
    [
      name,
      initial_price || 0,
      price || 0,
      opening_stock || 0,
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
// UPDATE PRODUCT
// =====================================================
router.put("/:id", (req, res) => {
  const { entree = 0, sold = 0, date } = req.body;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  db.query(
    `UPDATE bar_products 
     SET entree = ?, sold = ?
     WHERE id = ? AND date = ?`,
    [entree, sold, req.params.id, date],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Updated successfully" });
    }
  );
});

// =====================================================
// DELETE PRODUCT
// =====================================================
router.delete("/:id", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  db.query(
    "DELETE FROM bar_products WHERE id = ? AND date = ?",
    [req.params.id, date],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Deleted successfully" });
    }
  );
});

module.exports = router;