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

function formatLocalizacao(value) {
  if (!value) return "Desconhecida";
  if (typeof value === "string") return value.trim();
  if (value.texto) return value.texto;
  if (value.cidade) return value.cidade;
  return String(value);
}

function extractCidade(localizacaoTexto) {
  if (!localizacaoTexto) return "Desconhecida";
  return String(localizacaoTexto).split(",")[0].trim() || "Desconhecida";
}

function parseCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function validateCoordinates(latitude, longitude) {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);

  if ((lat === null && lng !== null) || (lat !== null && lng === null)) {
    return "Latitude e longitude devem ser preenchidas em conjunto";
  }

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return "Coordenadas invalidas";
  }

  if (lat !== null && (lat < -90 || lat > 90)) {
    return "Latitude deve estar entre -90 e 90";
  }

  if (lng !== null && (lng < -180 || lng > 180)) {
    return "Longitude deve estar entre -180 e 180";
  }

  return null;
}

function buildLocalizacao(value, latitude, longitude, currentLocalizacao) {
  const texto = value
    ? formatLocalizacao(value)
    : currentLocalizacao
      ? formatLocalizacao(currentLocalizacao)
      : "Desconhecida";
  const cidade = currentLocalizacao?.cidade && !value
    ? currentLocalizacao.cidade
    : extractCidade(texto);
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  const currentCoordinates = currentLocalizacao?.coordenadas
    || (currentLocalizacao?.lat !== undefined && currentLocalizacao?.lng !== undefined
      ? { lat: currentLocalizacao.lat, lng: currentLocalizacao.lng }
      : null);

  if (lat === null && lng === null && !currentCoordinates) {
    return typeof currentLocalizacao === "string" ? currentLocalizacao : texto;
  }

  return {
    texto,
    cidade,
    coordenadas: lat !== null && lng !== null ? { lat, lng } : currentCoordinates,
  };
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

function validateOccurrenceFields({
  tipo,
  descricao,
  localizacao,
  localizacaoTexto,
  prioridade,
  estado,
  latitude,
  longitude,
}, required = false) {
  if (
    required
    && (!tipo || !descricao || !prioridade
      || parseCoordinate(latitude) === null
      || parseCoordinate(longitude) === null)
  ) {
    return "tipo, descricao, prioridade e localizacao no mapa sao obrigatorios";
  }

  if (prioridade && !PRIORIDADES.has(normalizePrioridade(prioridade))) {
    return "Prioridade invalida";
  }

  if (estado && !ESTADOS.has(normalizeEstado(estado))) {
    return "Estado invalido";
  }

  return validateCoordinates(latitude, longitude);
}

async function findOcorrenciaById(id) {
  const query = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: id }],
  };

  const { resources } = await db.ocorrencias.items.query(query).fetchAll();
  return resources[0];
}

async function findUserById(id) {
  const query = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: id }],
  };

  const { resources } = await db.users.items.query(query).fetchAll();
  return resources[0];
}

function canManageOccurrence(user, ocorrencia) {
  return user.tipo === "admin" || ocorrencia.utilizadorId === user.id;
}

function getOccurrenceDate(ocorrencia) {
  return ocorrencia.createdAt || ocorrencia.updatedAt || ocorrencia.dataHora || ocorrencia.dataCriacao || "";
}

function sortOccurrencesByDateDesc(ocorrencias) {
  return [...ocorrencias].sort((a, b) => {
    const dateA = Date.parse(getOccurrenceDate(a)) || 0;
    const dateB = Date.parse(getOccurrenceDate(b)) || 0;
    return dateB - dateA;
  });
}

async function resolveAuthorName(ocorrencia) {
  if (ocorrencia.utilizadorNome) return ocorrencia.utilizadorNome;
  if (!ocorrencia.utilizadorId) return "Utilizador desconhecido";

  const utilizador = await findUserById(ocorrencia.utilizadorId);
  return utilizador?.nome || "Utilizador desconhecido";
}

async function enrichOccurrence(ocorrencia) {
  return {
    ...ocorrencia,
    utilizadorNome: await resolveAuthorName(ocorrencia),
  };
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
    const query = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC",
    };
    const { resources } = await db.ocorrencias.items.query(query).fetchAll();
    const ocorrencias = await Promise.all(sortOccurrencesByDateDesc(resources).map(enrichOccurrence));
    res.json(ocorrencias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao obter ocorrencias" });
  }
});

router.get("/recentes", async (req, res) => {
  try {
    const query = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC",
    };
    const { resources } = await db.ocorrencias.items.query(query).fetchAll();
    const recentes = sortOccurrencesByDateDesc(resources)
      .slice(0, 5);

    res.json(await Promise.all(recentes.map(enrichOccurrence)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao obter ocorrencias recentes" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const ocorrencia = await findOcorrenciaById(req.params.id);

    if (!ocorrencia) {
      return res.status(404).json({ erro: "Ocorrencia nao encontrada" });
    }

    res.json(await enrichOccurrence(ocorrencia));
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao obter ocorrencia" });
  }
});

router.post("/", auth, upload.single("imagem"), async (req, res) => {
  try {
    const { tipo, descricao, prioridade } = req.body;
    const validationError = validateOccurrenceFields(req.body, true);

    if (validationError) {
      return res.status(400).json({ erro: validationError });
    }

    const imagemUrl = req.file ? await uploadImage(req.file) : null;
    const utilizador = await findUserById(req.user.id);

    const ocorrencia = {
      id: uuidv4(),
      tipo: tipo.trim(),
      descricao: descricao.trim(),
      localizacao: buildLocalizacao(
        req.body.localizacaoTexto
          || req.body.localizacao
          || `${req.body.latitude}, ${req.body.longitude}`,
        req.body.latitude,
        req.body.longitude
      ),
      prioridade: normalizePrioridade(prioridade),
      estado: "pendente",
      fotos: imagemUrl ? [imagemUrl] : [],
      imagemUrl,
      utilizadorId: req.user.id,
      utilizadorNome: utilizador?.nome || req.user.email,
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

    if (!canManageOccurrence(req.user, ocorrencia)) {
      return res.status(403).json({ erro: "Sem permissao para atualizar esta ocorrencia" });
    }

    if (validationError) {
      return res.status(400).json({ erro: validationError });
    }

    ocorrencia.tipo = req.body.tipo ? req.body.tipo.trim() : ocorrencia.tipo;
    ocorrencia.descricao = req.body.descricao ? req.body.descricao.trim() : ocorrencia.descricao;
    if (
      req.body.localizacaoTexto
      || req.body.localizacao
      || req.body.latitude !== undefined
      || req.body.longitude !== undefined
    ) {
      ocorrencia.localizacao = buildLocalizacao(
        req.body.localizacaoTexto || req.body.localizacao,
        req.body.latitude,
        req.body.longitude,
        ocorrencia.localizacao
      );
    }
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

    if (!canManageOccurrence(req.user, ocorrencia)) {
      return res.status(403).json({ erro: "Sem permissao para eliminar esta ocorrencia" });
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
