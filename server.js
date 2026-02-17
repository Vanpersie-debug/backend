const express = require("express");
const cors = require("cors");

// ================= ROUTES =================
const barRoutes = require("./routes/bar");
const kitchenRoutes = require("./routes/kitchen");
const expensesRoutes = require("./routes/expenses");
const employeesRoutes = require("./routes/employees");
const totalsRoutes = require("./routes/totals");
const billiardRoutes = require("./routes/billiard");
const guesthouseRoutes = require("./routes/guesthouse");
const gymRoutes = require("./routes/gym");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= ROUTES =================
app.use("/api/drinks", barRoutes);
app.use("/api/kitchen", kitchenRoutes); // ✅ FIXED
app.use("/api/expenses", expensesRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/billiard", billiardRoutes);
app.use("/api/guesthouse", guesthouseRoutes);
app.use("/api/gym", gymRoutes);
app.use("/api", totalsRoutes);

// ================= DEFAULT ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 Backend is running!");
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});