import {
    EC2Client,
    TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import {
    ElasticLoadBalancingV2Client,
    DeleteTargetGroupCommand,
    DeleteRuleCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import {
    Route53Client,
    ChangeResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";
import { docClient } from "../infrastructure/database/DynamoDBClient";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
dotenv.config();

const ec2 = new EC2Client({ region: process.env.AWS_REGION });
const elb = new ElasticLoadBalancingV2Client({ region: process.env.AWS_REGION });
const route53 = new Route53Client({ region: process.env.AWS_REGION });

export class CleanupResources {
    static async terminateEC2(instanceId: string) {
        try {

            await ec2.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }));
        } catch (error) {
            console.error(" Failed to terminate EC2:", error);
        }
    }

    static async deleteTargetGroup(targetGroupArn: string) {
        try {

            await elb.send(new DeleteTargetGroupCommand({ TargetGroupArn: targetGroupArn }));
        } catch (error) {
            console.error(" Failed to delete target group:", error);
        }
    }

    static async deleteListenerRule(ruleArn: string) {
        try {

            await elb.send(new DeleteRuleCommand({ RuleArn: ruleArn }));
        } catch (error) {
            console.error(" Failed to delete listener rule:", error);
        }
    }

    static async deleteDNSRecord(subdomain: string) {
        const domainName = `${subdomain}.nestcrm.com.au.`;
        try {

            await route53.send(new ChangeResourceRecordSetsCommand({
                HostedZoneId: process.env.AWS_ROUTE53_ZONE_ID!,
                ChangeBatch: {
                    Changes: [{
                        Action: "DELETE",
                        ResourceRecordSet: {
                            Name: domainName,
                            Type: "CNAME",
                            TTL: 300,
                            ResourceRecords: [{ Value: process.env.ALB_DNS! }],
                        }
                    }]
                }
            }));
        } catch (error) {
            console.error(" Failed to delete DNS record:", error);
        }
    }

    static async deleteTenantRecord(tenantId: string) {
        try {

            await docClient.send(new DeleteCommand({
                TableName: process.env.DYNAMODB_TENANT_TABLE!,
                Key: { ID: tenantId }
            }));
        } catch (error) {
            console.error(" Failed to delete tenant from DB:", error);
        }
    }

    static async deleteTenantTables(subdomain: string) {
        const tableSuffixes = [
            "CustomFields", "Customer", "Order", "Payment", "Support", "Interaction", "Prediction", "ApiKey"
        ];

        for (const suffix of tableSuffixes) {
            const tableName = `NestCRM-${subdomain}-${suffix}`;
            try {

                await docClient.send(new DeleteTableCommand({ TableName: tableName }));
            } catch (error: any) {
                if (error.name === "ResourceNotFoundException") {
                    console.warn(` Table ${tableName} does not exist`);
                } else {
                    console.error(` Failed to delete table ${tableName}:`, error);
                }
            }
        }
    }
}
