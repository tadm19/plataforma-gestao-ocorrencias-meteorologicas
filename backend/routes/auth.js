const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const db = require("../services/db");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ erro: "Email e password sao obrigatorios" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const query = {
      query: "SELECT VALUE c.id FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: normalizedEmail }],
    };

    const { resources } = await db.users.items.query(query).fetchAll();

    if (resources.length > 0) {
      return res.status(409).json({ erro: "Email ja registado" });
    }

    const user = {
      id: uuidv4(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString(),
    };

    await db.users.items.create(user);

    res.status(201).json({ mensagem: "Utilizador criado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao registar utilizador" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ erro: "Email e password sao obrigatorios" });
    }

    const query = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email.trim().toLowerCase() }],
    };

    const { resources } = await db.users.items.query(query).fetchAll();
    const user = resources[0];

    if (!user) {
      return res.status(401).json({ erro: "Credenciais invalidas" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ erro: "Credenciais invalidas" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ erro: "JWT_SECRET nao configurado" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao iniciar sessao" });
  }
});

module.exports = router;
