import {
    DynamoDBClient,
    CreateTableCommand,
    ScalarAttributeType,
    KeySchemaElement,
    AttributeDefinition,
} from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";

dotenv.config();

const REGION = process.env.AWS_REGION!;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID!;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

const TABLE_DEFINITIONS: {
    name: string;
    key: { name: string; type: ScalarAttributeType };
    sortKey?: { name: string; type: ScalarAttributeType };
}[] = [
        { name: "Customer", key: { name: "id", type: "S" } },
        { name: "Order", key: { name: "id", type: "S" } },
        { name: "Payment", key: { name: "id", type: "S" } },
        { name: "Support", key: { name: "id", type: "S" } },
        { name: "Interaction", key: { name: "id", type: "S" } },
        { name: "CustomFields", key: { name: "PK", type: "S" } },
        { name: "ApiKey", key: { name: "id", type: "S" } },
        {
            name: "Prediction",
            key: { name: "id", type: "S" },
            sortKey: { name: "latest_prediction_at", type: "S" },
        },
        {
            name: "RiskAlert",
            key: { name: "id", type: "S" },
            sortKey: { name: "created_at", type: "S" },
        },
    ];

export const createTablesForTenant = async (subdomain: string) => {
    const client = new DynamoDBClient({
        region: REGION,
        credentials: {
            accessKeyId: ACCESS_KEY,
            secretAccessKey: SECRET_KEY,
        },
    });

    for (const { name, key, sortKey } of TABLE_DEFINITIONS) {
        const tableName = `NestCRM-${subdomain}-${name}`;

        const AttributeDefinitions: AttributeDefinition[] = [
            { AttributeName: key.name, AttributeType: key.type },
        ];
        const KeySchema: KeySchemaElement[] = [
            { AttributeName: key.name, KeyType: "HASH" },
        ];

        if (sortKey) {
            AttributeDefinitions.push({
                AttributeName: sortKey.name,
                AttributeType: sortKey.type,
            });
            KeySchema.push({
                AttributeName: sortKey.name,
                KeyType: "RANGE",
            });
        }

        const command = new CreateTableCommand({
            TableName: tableName,
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions,
            KeySchema,
        });

        try {
            await client.send(command);

        } catch (err: any) {
            if (err.name === "ResourceInUseException") {

            } else {
                console.error(` Failed to create table: ${tableName}`, err);
            }
        }
    }
};