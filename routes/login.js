const express = require("express");
const router = express.Router();

const verifyToken = require("./middleware/authMiddleware");
const allowRoles = require("./middleware/roleMiddleware");

const {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser
} = require("./controllers/userController");

router.post("/create", verifyToken, allowRoles("SUPER_ADMIN","ADMIN"), createUser);

router.get("/", verifyToken, allowRoles("SUPER_ADMIN","ADMIN"), getUsers);

router.get("/:id", verifyToken, allowRoles("SUPER_ADMIN","ADMIN"), getUser);

router.put("/:id", verifyToken, allowRoles("SUPER_ADMIN","ADMIN"), updateUser);

router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN"), deleteUser);

module.exports = router;