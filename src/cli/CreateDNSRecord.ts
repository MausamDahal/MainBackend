import { Route53Client, ChangeResourceRecordSetsCommand } from "@aws-sdk/client-route-53";
import dotenv from "dotenv";
dotenv.config();

const route53 = new Route53Client({
    region: "us-east-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const HOSTED_ZONE_ID = process.env.AWS_ROUTE53_ZONE_ID!;

export class CreateDNSRecord {
    static async addSubdomain(subdomain: string, publicIp: string) {
        const domainName = `${subdomain}.nestcrm.com.au.`;



        const ALB_DNS_NAME = "NestCRM-ALB-111803615.us-east-2.elb.amazonaws.com";

        const command = new ChangeResourceRecordSetsCommand({
            HostedZoneId: HOSTED_ZONE_ID,
            ChangeBatch: {
                Changes: [
                    {
                        Action: "UPSERT",
                        ResourceRecordSet: {
                            Name: domainName, // eg. acmecorp.nestcrm.com.au.
                            Type: "CNAME", // 👈 CNAME for subdomains
                            TTL: 300,
                            ResourceRecords: [{ Value: ALB_DNS_NAME }],
                        },
                    },
                ],
            },
        });


        try {

            const response = await route53.send(command);


        } catch (error: any) {
            console.error(" Failed to create DNS record:", error);
        }
    }
}


