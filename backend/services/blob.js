const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

const blobService = BlobServiceClient.fromConnectionString(
  process.env.BLOB_CONNECTION
);

const container = blobService.getContainerClient(
  process.env.BLOB_CONTAINER
);

async function uploadImage(file) {
  const name = uuidv4() + "-" + file.originalname;
  const blockBlob = container.getBlockBlobClient(name);

  await blockBlob.uploadData(file.buffer);

  return blockBlob.url;
}

module.exports = { uploadImage };