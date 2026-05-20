const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const auth = require("../middleware/auth");
const db = require("../services/db");
const { deleteImageByUrl, uploadImage } = require("../services/blob");

const router = express.Router();
const PRIORIDADES = new Set(["baixa", "media", "alta", "critica"]);
const ESTADOS = new Set(["pendente", "em resolucao", "resolvido", "arquivada"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("O ficheiro tem de ser uma imagem"));
    }

    cb(null, true);
  },
});

function normalizeLocalizacao(value) {
  if (!value) return "Desconhecida";
  if (typeof value === "string") return value.trim();
  if (value.cidade) return value.cidade;
  return String(value);
}

function normalizePrioridade(value) {
  if (!value) return value;

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "media") return "media";
  if (normalized === "critica") return "critica";
  return normalized;
}

function normalizeEstado(value) {
  if (!value) return value;

  return value.trim().toLowerCase();
}

function validateOccurrenceFields({ tipo, descricao, localizacao, prioridade, estado }, required = false) {
  if (required && (!tipo || !descricao || !localizacao || !prioridade)) {
    return "tipo, descricao, localizacao e prioridade sao obrigatorios";
  }

  if (prioridade && !PRIORIDADES.has(normalizePrioridade(prioridade))) {
    return "Prioridade invalida";
  }

  if (estado && !ESTADOS.has(normalizeEstado(estado))) {
    return "Estado invalido";
  }

  return null;
}

async function findOcorrenciaById(id) {
  const query = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: id }],
  };

  const { resources } = await db.ocorrencias.items.query(query).fetchAll();
  return resources[0];
}

async function getPartitionKeyValue(container, item) {
  const { resource } = await container.read();
  const path = resource?.partitionKey?.paths?.[0];

  if (!path) return undefined;

  return path
    .replace(/^\//, "")
    .split("/")
    .reduce((value, key) => (value ? value[key] : undefined), item);
}

router.get("/", async (req, res) => {
  try {
    const { resources } = await db.ocorrencias.items.readAll().fetchAll();
    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao obter ocorrencias" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const ocorrencia = await findOcorrenciaById(req.params.id);

    if (!ocorrencia) {
      return res.status(404).json({ erro: "Ocorrencia nao encontrada" });
    }

    res.json(ocorrencia);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao obter ocorrencia" });
  }
});

router.post("/", auth, upload.single("imagem"), async (req, res) => {
  try {
    const { tipo, descricao, localizacao, prioridade } = req.body;
    const validationError = validateOccurrenceFields(req.body, true);

    if (validationError) {
      return res.status(400).json({ erro: validationError });
    }

    const imagemUrl = req.file ? await uploadImage(req.file) : null;

    const ocorrencia = {
      id: uuidv4(),
      tipo: tipo.trim(),
      descricao: descricao.trim(),
      localizacao: normalizeLocalizacao(localizacao),
      prioridade: normalizePrioridade(prioridade),
      estado: "pendente",
      fotos: imagemUrl ? [imagemUrl] : [],
      imagemUrl,
      utilizadorId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.ocorrencias.items.create(ocorrencia);

    res.status(201).json(ocorrencia);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message || "Erro ao criar ocorrencia" });
  }
});

router.put("/:id", auth, upload.single("imagem"), async (req, res) => {
  try {
    const ocorrencia = await findOcorrenciaById(req.params.id);
    const validationError = validateOccurrenceFields(req.body);

    if (!ocorrencia) {
      return res.status(404).json({ erro: "Ocorrencia nao encontrada" });
    }

    if (validationError) {
      return res.status(400).json({ erro: validationError });
    }

    ocorrencia.tipo = req.body.tipo ? req.body.tipo.trim() : ocorrencia.tipo;
    ocorrencia.descricao = req.body.descricao ? req.body.descricao.trim() : ocorrencia.descricao;
    ocorrencia.localizacao = req.body.localizacao
      ? normalizeLocalizacao(req.body.localizacao)
      : ocorrencia.localizacao;
    ocorrencia.prioridade = req.body.prioridade
      ? normalizePrioridade(req.body.prioridade)
      : ocorrencia.prioridade;
    ocorrencia.estado = req.body.estado ? normalizeEstado(req.body.estado) : ocorrencia.estado;

    if (req.file) {
      const imagemUrl = await uploadImage(req.file);
      const imagensAntigas = Array.isArray(ocorrencia.fotos)
        ? ocorrencia.fotos
        : ocorrencia.imagemUrl
          ? [ocorrencia.imagemUrl]
          : [];

      await Promise.all(imagensAntigas.map((imageUrl) => deleteImageByUrl(imageUrl)));
      ocorrencia.fotos = [imagemUrl];
      ocorrencia.imagemUrl = imagemUrl;
    }

    ocorrencia.updatedAt = new Date().toISOString();

    await db.ocorrencias.items.upsert(ocorrencia);

    res.json(ocorrencia);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao atualizar ocorrencia" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const ocorrencia = await findOcorrenciaById(req.params.id);

    if (!ocorrencia) {
      return res.status(404).json({ erro: "Ocorrencia nao encontrada" });
    }

    const partitionKeyValue = await getPartitionKeyValue(db.ocorrencias, ocorrencia);
    const imagens = Array.isArray(ocorrencia.fotos)
      ? ocorrencia.fotos
      : ocorrencia.imagemUrl
        ? [ocorrencia.imagemUrl]
        : [];

    await Promise.all(imagens.map((imageUrl) => deleteImageByUrl(imageUrl)));
    await db.ocorrencias.item(ocorrencia.id, partitionKeyValue).delete();

    res.json({ mensagem: "Ocorrencia eliminada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao eliminar ocorrencia" });
  }
});

module.exports = router;
