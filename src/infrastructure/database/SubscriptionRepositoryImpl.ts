import { docClient } from "../database/DynamoDBClient";
import {
    PutCommand,
    QueryCommand,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { Subscription } from "../../domain/entities/Subscription";
import { SubscriptionRepository } from "../../domain/repositories/SubscriptionRepository";

const TABLE_NAME = "NestCRM-Subscription";

export class SubscriptionRepositoryImpl implements SubscriptionRepository {
    async updateFields(stripeId: string, updateFields: Partial<Subscription>): Promise<void> {
        const existing = await this.findByStripeSubscriptionID(stripeId);
        if (!existing) throw new Error("Subscription not found");

        const updateExp: string[] = [];
        const attrNames: Record<string, string> = {};
        const attrValues: Record<string, any> = { ":now": new Date().toISOString() };
        let idx = 0;
        for (const key in updateFields) {
            if (updateFields[key as keyof Partial<Subscription>] !== undefined) {
                const nameKey = `#field${idx}`;
                const valueKey = `:val${idx}`;
                updateExp.push(`${nameKey} = ${valueKey}`);
                attrNames[nameKey] = key;
                attrValues[valueKey] = updateFields[key as keyof Partial<Subscription>];
                idx++;
            }
        }
        updateExp.push("UpdatedAt = :now");
        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { ID: existing.ID },
            UpdateExpression: "SET " + updateExp.join(", "),
            ExpressionAttributeNames: attrNames,
            ExpressionAttributeValues: attrValues,
        }));
    }

    async create(subscription: Subscription): Promise<Subscription> {
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: subscription
        }));
        return subscription;
    }

    async findByTenantID(tenantID: string): Promise<Subscription[]> {
        const result = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "TenantID-index",
            KeyConditionExpression: "TenantID = :tenantId",
            ExpressionAttributeValues: {
                ":tenantId": tenantID
            }
        }));

        return result.Items as Subscription[] || [];
    }

    async findByStripeSubscriptionID(stripeId: string): Promise<Subscription | null> {
        const result = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "StripeSubscriptionID-index",
            KeyConditionExpression: "StripeSubscriptionID = :sid",
            ExpressionAttributeValues: {
                ":sid": stripeId
            }
        }));

        return result.Items?.[0] as Subscription || null;
    }

    async updateStatus(stripeId: string, status: string): Promise<void> {
        const existing = await this.findByStripeSubscriptionID(stripeId);
        if (!existing) throw new Error("Subscription not found");

        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { ID: existing.ID }, // <- use real PK
            UpdateExpression: "SET #Status = :status, UpdatedAt = :now",
            ExpressionAttributeNames: {
                "#Status": "Status"
            },
            ExpressionAttributeValues: {
                ":status": status,
                ":now": new Date().toISOString()
            }
        }));
    }
}