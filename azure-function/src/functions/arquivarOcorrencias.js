const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

app.timer('arquivarOcorrencias', {
    schedule: '0 0 0 * * *',

    handler: async (myTimer, context) => {

        context.log('A verificar ocorrências antigas');

        try {

            const client = new CosmosClient({
                endpoint: process.env.COSMOS_ENDPOINT,
                key: process.env.COSMOS_KEY
            });

            const database = client.database(process.env.COSMOS_DATABASE);

            const container = database.container('ocorrencias');

            const seteDias = new Date();

            seteDias.setDate(seteDias.getDate() - 7);

            const querySpec = {
                query: `
                    SELECT * FROM c
                    WHERE c.estado != "arquivada"
                    AND c.createdAt < @data
                `,
                parameters: [
                    {
                        name: "@data",
                        value: seteDias.toISOString()
                    }
                ]
            };

            const { resources } = await container.items
                .query(querySpec)
                .fetchAll();

            context.log(`Encontradas ${resources.length} ocorrências`);

            for (const ocorrencia of resources) {

                ocorrencia.estado = "arquivada";

                ocorrencia.arquivadaEm = new Date().toISOString();

                await container
                    .item(ocorrencia.id, ocorrencia.id)
                    .replace(ocorrencia);
            }

            context.log('Arquivamento concluído');

        } catch (erro) {

            context.log('Erro:', erro.message);
        }
    }
});