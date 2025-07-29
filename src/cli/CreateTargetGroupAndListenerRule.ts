import {
    ElasticLoadBalancingV2Client,
    CreateTargetGroupCommand,
    RegisterTargetsCommand,
    CreateRuleCommand,
    CreateRuleCommandOutput,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import dotenv from "dotenv";
dotenv.config();

const elb = new ElasticLoadBalancingV2Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const TARGET_GROUP_PROTOCOL = "HTTP";
const TARGET_GROUP_PORT = 3000;

export class CreateTargetGroupAndListenerRule {
    static async setup(subdomain: string, instanceId: string): Promise<{
        targetGroupArn: string;
        httpsListenerRuleArn: string;
        httpListenerRuleArn: string;
    } | null> {
        const targetGroupName = `tg-${subdomain.replaceAll(".", "-")}`;
        const albArn = process.env.AWS_ALB_ARN!;
        const httpListenerArn = process.env.AWS_LISTENER_ARN_HTTP!;
        const httpsListenerArn = process.env.AWS_LISTENER_ARN_HTTPS!;

        try {
            // Step 1: Create Target Group
            const targetGroupResponse = await elb.send(
                new CreateTargetGroupCommand({
                    Name: targetGroupName.slice(0, 32),
                    Protocol: TARGET_GROUP_PROTOCOL,
                    Port: TARGET_GROUP_PORT,
                    VpcId: process.env.AWS_VPC_ID!,
                    TargetType: "instance",
                    HealthCheckProtocol: "HTTP",
                    HealthCheckPath: "/api/status",
                    HealthCheckPort: "3000",
                })
            );

            const targetGroupArn = targetGroupResponse.TargetGroups?.[0]?.TargetGroupArn;
            if (!targetGroupArn) throw new Error(" Failed to create Target Group");

            // Step 2: Register EC2 instance
            await elb.send(
                new RegisterTargetsCommand({
                    TargetGroupArn: targetGroupArn,
                    Targets: [{ Id: instanceId, Port: TARGET_GROUP_PORT }],
                })
            );

            // Step 3a: Create HTTPS Listener Rule (forward)
            const httpsListenerRuleResult: CreateRuleCommandOutput = await elb.send(
                new CreateRuleCommand({
                    ListenerArn: httpsListenerArn,
                    Conditions: [
                        {
                            Field: "host-header",
                            Values: [`${subdomain}.mausamcrm.site`],
                        },
                    ],
                    Actions: [
                        {
                            Type: "forward",
                            TargetGroupArn: targetGroupArn,
                        },
                    ],
                    Priority: Math.floor(Math.random() * 10000),
                })
            );
            const httpsListenerRuleArn = httpsListenerRuleResult.Rules?.[0]?.RuleArn;
            if (!httpsListenerRuleArn) throw new Error(" Failed to create HTTPS Listener Rule");

            // Step 3b: Create HTTP Listener Rule (redirect to HTTPS)
            const httpListenerRuleResult: CreateRuleCommandOutput = await elb.send(
                new CreateRuleCommand({
                    ListenerArn: httpListenerArn,
                    Conditions: [
                        {
                            Field: "host-header",
                            Values: [`${subdomain}.mausamcrm.site`],
                        },
                    ],
                    Actions: [
                        {
                            Type: "redirect",
                            RedirectConfig: {
                                Protocol: "HTTPS",
                                Port: "443",
                                StatusCode: "HTTP_301",
                            },
                        },
                    ],
                    Priority: Math.floor(Math.random() * 10000),
                })
            );
            const httpListenerRuleArn = httpListenerRuleResult.Rules?.[0]?.RuleArn;
            if (!httpListenerRuleArn) throw new Error(" Failed to create HTTP Listener Rule");

            return {
                targetGroupArn,
                httpsListenerRuleArn,
                httpListenerRuleArn,
            };
        } catch (error) {
            console.error(" Error during setup:", error);
            return null; // or re-throw if you want to handle it higher up
        }
    }
}