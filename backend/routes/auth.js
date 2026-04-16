const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const db = require("../services/db");

// REGISTO
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const user = {
    id: uuidv4(),
    email,
    password: hash
  };

  await db.users.items.create(user);

  res.sendStatus(201);
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const query = {
    query: "SELECT * FROM c WHERE c.email=@e",
    parameters: [{ name: "@e", value: email }]
  };

  const { resources } = await db.users.items.query(query).fetchAll();
  const user = resources[0];

  if (!user) return res.status(401).send("Erro");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).send("Erro");

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

  res.json({ token });
});

module.exports = router;