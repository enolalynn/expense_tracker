const jwt = require("jsonwebtoken");
const { tokenKey } = require("../utils");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authMiddleware(req, res, next) {
  const token = req.header.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send("Provide token");
  }
  try {
    const verify = jwt.verify(token, tokenKey);
    if (verify) {
      req.user = {
        userId: verify.userId,
        email: verify.email,
      };
      next();
    } else {
      return res.status(401).send("Invalid token");
    }
  } catch (error) {
    return res.status(401).send("Unauthorize");
  }
}

module.exports = { authMiddleware };
