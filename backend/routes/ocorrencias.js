const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

const auth = require("../middleware/auth");
const db = require("../services/db");
const { uploadImage } = require("../services/blob");

const upload = multer();

// GET (público)
router.get("/", async (req, res) => {
  const { resources } = await db.ocorrencias.items.readAll().fetchAll();
  res.json(resources);
});

// GET por ID
router.get("/:id", async (req, res) => {
  const { resource } = await db.ocorrencias.item(req.params.id).read();
  res.json(resource);
});

// POST (protegido)
router.post("/", auth, upload.single("imagem"), async (req, res) => {
  let imagemUrl = null;

  if (req.file) {
    imagemUrl = await uploadImage(req.file);
  }

  const ocorrencia = {
    id: uuidv4(),
    descricao: req.body.descricao,
    localizacao: req.body.localizacao,
    estado: "Pendente",
    imagemUrl,
    userId: req.user.id,
    data: new Date()
  };

  await db.ocorrencias.items.create(ocorrencia);

  res.sendStatus(201);
});

// PUT (protegido)
router.put("/:id", auth, async (req, res) => {
  const { resource } = await db.ocorrencias.item(req.params.id).read();

  resource.estado = req.body.estado;

  await db.ocorrencias.items.upsert(resource);

  res.sendStatus(200);
});

module.exports = router;