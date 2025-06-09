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
  static async launchInstance(subdomain: string): Promise<{ instanceId: string; publicIp?: string }> {
    try {
      const launchCommand = new RunInstancesCommand({
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
          sudo yum install -y git nodejs unzip
          curl -sS https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo
          sudo yum install -y yarn
          cd /home/ec2-user
          git clone https://github.com/WellingtonDevBR/NestCRM-Dashboard-Backend.git
          cd NestCRM-Dashboard-Backend
          yarn install
          nohup yarn dev > /home/ec2-user/app.log 2>&1 &
        `).toString("base64"),
      });

      const launchResult = await ec2.send(launchCommand);
      const instanceId = launchResult.Instances?.[0]?.InstanceId;
      if (!instanceId) throw new Error("Failed to launch EC2 instance");

      await waitUntilInstanceRunning(
        { client: ec2, maxWaitTime: 60 },
        { InstanceIds: [instanceId] }
      );

      const describeResult = await ec2.send(
        new DescribeInstancesCommand({ InstanceIds: [instanceId] })
      );

      const publicIp = describeResult.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;

      return { instanceId, publicIp };
    } catch (error) {
      console.error("EC2 Provisioning Failed:", error);
      throw error;
    }
  }
}

// ✅ Auto-provision for test tenant
ProvisionEC2.launchInstance("my-tenant-1");
