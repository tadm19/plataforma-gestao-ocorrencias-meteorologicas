const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const auth = require("../middleware/auth");
const db = require("../services/db");
const { deleteImageByUrl, uploadImage } = require("../services/blob");

const router = express.Router();

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
  if (typeof value === "string") return value;
  if (value.cidade) return value.cidade;
  return String(value);
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

    if (!tipo || !descricao || !localizacao || !prioridade) {
      return res.status(400).json({
        erro: "tipo, descricao, localizacao e prioridade sao obrigatorios",
      });
    }

    const imagemUrl = req.file ? await uploadImage(req.file) : null;

    const ocorrencia = {
      id: uuidv4(),
      tipo,
      descricao,
      localizacao: normalizeLocalizacao(localizacao),
      prioridade,
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

router.put("/:id", auth, async (req, res) => {
  try {
    const ocorrencia = await findOcorrenciaById(req.params.id);

    if (!ocorrencia) {
      return res.status(404).json({ erro: "Ocorrencia nao encontrada" });
    }

    ocorrencia.tipo = req.body.tipo || ocorrencia.tipo;
    ocorrencia.descricao = req.body.descricao || ocorrencia.descricao;
    ocorrencia.localizacao = req.body.localizacao
      ? normalizeLocalizacao(req.body.localizacao)
      : ocorrencia.localizacao;
    ocorrencia.prioridade = req.body.prioridade || ocorrencia.prioridade;
    ocorrencia.estado = req.body.estado || ocorrencia.estado;
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
