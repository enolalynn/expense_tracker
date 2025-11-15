const express = require("express");
const authRouter = express.Router();
const {
  registerUser,
  getAllUsers,
  updateUser,
  deleteUser,
} = require("../controllers/auth.controller.js");
const { body, param } = require("express-validator");

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

module.exports = authRouter;
