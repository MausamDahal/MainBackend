// ProvisionEC2.ts
import {
    EC2Client,
    RunInstancesCommand,
    waitUntilInstanceRunning,
    DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";

import dotenv from "dotenv";
dotenv.config();

const region = "us-east-2";
const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
};

const ec2 = new EC2Client({ region, credentials });

export class ProvisionEC2 {
    private static readonly instanceProfileName = "TenantEC2Role";

    static async launchInstance(subdomain: string) {
        try {
            const command = new RunInstancesCommand({
                ImageId: "ami-0d0f28110d16ee7d6",
                InstanceType: "t2.micro",
                MinCount: 1,
                MaxCount: 1,
                SubnetId: "subnet-09ba46adbd977b569",
                SecurityGroupIds: ["sg-0f89eae7985996979"],
                IamInstanceProfile: {
                    Name: this.instanceProfileName,
                },
                TagSpecifications: [
                    {
                        ResourceType: "instance",
                        Tags: [
                            { Key: "Name", Value: `Tenant-${subdomain}` },
                            { Key: "OwnerSubdomain", Value: subdomain },
                        ],
                    },
                ],
                UserData: Buffer.from(`#!/bin/bash
                    # Install Node.js 18 using NodeSource
                    curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
                    sudo yum install -y nodejs git unzip

                    # Add Yarn repo and install it
                    curl -sS https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo
                    sudo yum install -y yarn

                    # Clone the backend and install dependencies
                    cd /home/ec2-user
                    git clone https://github.com/WellingtonDevBR/NestCRM-Dashboard-Backend.git
                    cd NestCRM-Dashboard-Backend
                    yarn install

                    # Install PM2 and run the app
                    sudo npm install -g pm2
                    pm2 start yarn --interpreter bash --name my-server -- dev
                    pm2 save

                    # Set PM2 to restart on reboot
                    pm2 startup systemd -u ec2-user --hp /home/ec2-user
                    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
                    pm2 save
                `).toString("base64"),
            });

            const result = await ec2.send(command);
            const instanceId = result.Instances?.[0]?.InstanceId;
            if (!instanceId) throw new Error("Failed to launch EC2 instance");


            await waitUntilInstanceRunning(
                { client: ec2, maxWaitTime: 60 },
                { InstanceIds: [instanceId] }
            );

            const describe = await ec2.send(
                new DescribeInstancesCommand({ InstanceIds: [instanceId] })
            );
            const publicIp =
                describe.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;

            if (!publicIp) throw new Error("Instance running but no public IP");


            return { instanceId, publicIp };
        } catch (error) {
            console.error(" EC2 Provisioning Failed:", error);
            throw error;
        }
    }
}
