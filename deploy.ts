// provision-ec2-bun.ts
import {
  EC2Client,
  RunInstancesCommand,
  waitUntilInstanceRunning,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";
import dotenv from "dotenv";
dotenv.config();

const ec2 = new EC2Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export class ProvisionEC2 {
  static async launchInstance(subdomain: string) {
    try {
      const command = new RunInstancesCommand({
        ImageId: "ami-0d0f28110d16ee7d6",
        InstanceType: "t2.micro",
        MinCount: 1,
        MaxCount: 1,
        SubnetId: "subnet-09ba46adbd977b569",
        SecurityGroupIds: ["sg-0f89eae7985996979"],
        TagSpecifications: [
          {
            ResourceType: "instance",
            Tags: [
              { Key: "Name", Value: `${subdomain}` },
              { Key: "Owner", Value: subdomain },
            ],
          },
        ],
        UserData: Buffer.from(`#!/bin/bash
          sudo yum update -y
          sudo yum install -y git curl
          sudo yum install git -y
          
          cd /home/ec2-user
          git clone https://github.com/WellingtonDevBR/NestCRM-Main-Backend.git
          cd NestCRM-Main-Backend

          # Install Bun
          curl -fsSL https://bun.sh/install | bash
          export BUN_INSTALL="/home/ec2-user/.bun"
          export PATH="$BUN_INSTALL/bin:$PATH"
          sudo chown -R ec2-user:ec2-user .

          # Install dependencies & run
          bun install
          nohup bun run src/server.ts > output.log 2>&1 &

          # Optional: configure AWS CLI (manual placeholder)
          # echo -e "${process.env.AWS_ACCESS_KEY_ID!}\\n${process.env.AWS_SECRET_ACCESS_KEY!}\\nus-east-2\\njson" | aws configure
        `).toString("base64"),
      });

      const result = await ec2.send(command);
      const instanceId = result.Instances?.[0]?.InstanceId;
      if (!instanceId) throw new Error("Failed to launch EC2 instance");


      await waitUntilInstanceRunning(
        { client: ec2, maxWaitTime: 60 },
        { InstanceIds: [instanceId] }
      );

      const describeCommand = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
      const describeResult = await ec2.send(describeCommand);
      const publicIp = describeResult.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;


      return { instanceId, publicIp };
    } catch (error: any) {
      console.error(" EC2 Provisioning Failed:", error);
      throw error;
    }
  }
}

// ✅ Execute immediately
ProvisionEC2.launchInstance("NestCRM-Main-Backend");
