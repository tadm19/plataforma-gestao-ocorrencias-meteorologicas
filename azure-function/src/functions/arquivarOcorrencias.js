const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

function getPartitionKeyValue(containerDefinition, item) {
    const path = containerDefinition?.partitionKey?.paths?.[0];

    if (!path) return undefined;

    return path
        .replace(/^\//, "")
        .split("/")
        .reduce((value, key) => (value ? value[key] : undefined), item);
}

function requireEnv(name) {
    if (!process.env[name]) {
        throw new Error(`Variavel de ambiente em falta: ${name}`);
    }

    return process.env[name];
}

app.timer("arquivarOcorrencias", {
    schedule: "0 0 0 * * *",

    handler: async (myTimer, context) => {
        context.log("A verificar ocorrencias antigas");

        try {
            const client = new CosmosClient({
                endpoint: requireEnv("COSMOS_ENDPOINT"),
                key: requireEnv("COSMOS_KEY"),
            });

            const database = client.database(requireEnv("COSMOS_DATABASE"));
            const container = database.container(process.env.COSMOS_OCORRENCIAS_CONTAINER || "ocorrencias");
            const { resource: containerDefinition } = await container.read();

            const seteDias = new Date();
            seteDias.setDate(seteDias.getDate() - 7);

            const querySpec = {
                query: `
                    SELECT * FROM c
                    WHERE c.estado != "arquivada"
                    AND IS_DEFINED(c.createdAt)
                    AND c.createdAt < @data
                `,
                parameters: [
                    {
                        name: "@data",
                        value: seteDias.toISOString(),
                    },
                ],
            };

            const { resources } = await container.items
                .query(querySpec)
                .fetchAll();

            context.log(`Encontradas ${resources.length} ocorrencias`);

            for (const ocorrencia of resources) {
                ocorrencia.estado = "arquivada";
                ocorrencia.arquivadaEm = new Date().toISOString();
                ocorrencia.updatedAt = ocorrencia.arquivadaEm;

                const partitionKeyValue = getPartitionKeyValue(containerDefinition, ocorrencia);

                await container
                    .item(ocorrencia.id, partitionKeyValue)
                    .replace(ocorrencia);
            }

            context.log("Arquivamento concluido");
        } catch (erro) {
            context.error("Erro:", erro.message);
            throw erro;
        }
    },
});
