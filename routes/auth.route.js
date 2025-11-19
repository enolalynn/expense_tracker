const express = require("express");
const authRouter = express.Router();
const {
  registerUser,
  getAllUsers,
  updateUser,
  deleteUser,
  loginUser,
  income,
  expense,
  updateTransactions,
  deleteTransaction,
  singleUserTransactions,
  getAllTransactions,
  dailyReport,
  weeklyReport,
  monthlyReport,
} = require("../controllers/auth.controller.js");
const { body, param } = require("express-validator");
const { authMiddleware } = require("../middleware/auth.middleware.js");

authRouter.post(
  "/register",
  [
    body("name")
      .isString()
      .isLength({ min: 6, max: 200 })
      .withMessage("Name must be between 6 and 200 long"),
    body("email").isEmail().withMessage("Invalid format"),
    body("password")
      .isString()
      .isLength({ min: 6, max: 30 })
      .withMessage("Password must be between 6 and 30 long"),
  ],
  registerUser
);

authRouter.get("/users", getAllUsers);

authRouter.patch("/users/:id", [body("id")], updateUser);
authRouter.delete("/users/:id", [param("id")], deleteUser);

authRouter.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isString().withMessage("Incorrect password!"),
  ],
  loginUser
);
authRouter.post("/user/income", authMiddleware, income);
authRouter.post("/user/expense", authMiddleware, expense);

authRouter.patch("/user/transaction/:id", authMiddleware, updateTransactions);

authRouter.delete("/user/transaction/:id", authMiddleware, deleteTransaction);

authRouter.get(
  "/user/transaction-history",
  authMiddleware,
  singleUserTransactions
);

authRouter.get("/users/transactions", getAllTransactions);

authRouter.get("/user/daily/:date", authMiddleware, dailyReport);

authRouter.get("/user/weekly/:date", authMiddleware, weeklyReport);

authRouter.get("/user/monthly/:date", authMiddleware, monthlyReport);

module.exports = authRouter;
