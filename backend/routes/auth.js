const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const db = require("../services/db");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(telefone) {
  return String(telefone || "").replace(/\s+/g, "");
}

function validateRegisterPayload(payload) {
  const requiredFields = ["nome", "email", "password", "idade", "telefone", "cidade"];
  const missingField = requiredFields.find((field) => {
    const value = payload[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missingField) {
    return `O campo ${missingField} e obrigatorio`;
  }

  if (!isValidEmail(String(payload.email).trim())) {
    return "Email invalido";
  }

  if (String(payload.password).length < 6) {
    return "A password deve ter pelo menos 6 caracteres";
  }

  const idade = Number(payload.idade);
  if (!Number.isInteger(idade) || idade < 1 || idade > 120) {
    return "Idade invalida";
  }

  const telefone = normalizePhone(payload.telefone);
  if (!/^[29]\d{8}$/.test(telefone)) {
    return "Telefone invalido";
  }

  return null;
}

router.post("/register", async (req, res) => {
  try {
    const validationError = validateRegisterPayload(req.body);

    if (validationError) {
      return res.status(400).json({ erro: validationError });
    }

    const { nome, email, password, idade, telefone, cidade } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(telefone);
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
      nome: nome.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      idade: Number(idade),
      telefone: normalizedPhone,
      cidade: cidade.trim(),
      tipo: "user",
      createdAt: new Date().toISOString(),
    };

    await db.users.items.create(user);

    res.status(201).json({
      mensagem: "Utilizador criado",
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        idade: user.idade,
        telefone: user.telefone,
        cidade: user.cidade,
        tipo: user.tipo,
        createdAt: user.createdAt,
      },
    });
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

    const userType = user.tipo === "admin" ? "admin" : "user";

    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: userType },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: userType,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao iniciar sessao" });
  }
});

module.exports = router;
