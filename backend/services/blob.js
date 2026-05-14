const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("Variavel de ambiente em falta: AZURE_STORAGE_CONNECTION_STRING");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerName = "imagens";

async function uploadImage(file) {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists();

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    const blobName = `${Date.now()}-${uuidv4()}-${safeName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    return blockBlobClient.url;
  } catch (error) {
    console.error("Erro upload blob:", error);
    throw error;
  }
}

async function deleteImageByUrl(imageUrl) {
  if (!imageUrl) return;

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop());

    if (blobName) {
      await containerClient.deleteBlob(blobName, { deleteSnapshots: "include" });
    }
  } catch (error) {
    console.warn("Nao foi possivel apagar imagem do blob:", error.message);
  }
}

module.exports = {
  uploadImage,
  deleteImageByUrl,
};
