import { TenantRepositoryImpl } from "../../infrastructure/database/TenantRepositoryImpl";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { ProvisionEC2 } from "../../cli/ProvisionEC2";
import { CreateTargetGroupAndListenerRule } from "../../cli/CreateTargetGroupAndListenerRule";
import { CleanupResources } from "../../cli/CleanupResources";
import jwt from "jsonwebtoken";
import { createTablesForTenant } from "../../cli/CreateTenantTables";
import { SubscriptionRepositoryImpl } from "../../infrastructure/database/SubscriptionRepositoryImpl";
import { Subscription } from "../../domain/entities/Subscription";

const tenantRepo = new TenantRepositoryImpl();
const subscriptionRepo = new SubscriptionRepositoryImpl();

export class TenantUseCase {
    static async login({ email, password }: { email: string; password: string }) {
        if (!email || !password) throw new Error("Missing email or password");

        const tenant = await tenantRepo.findByEmail(email);
        if (!tenant) throw new Error("Tenant not found");

        const passwordMatch = await bcrypt.compare(password, tenant.Password);
        if (!passwordMatch) throw new Error("Invalid credentials");

        const subscriptions = await subscriptionRepo.findByTenantID(tenant.ID);
        const sub = subscriptions?.[0];

        const isSubscriptionValid = this.isSubscriptionValid(sub);

        const token = jwt.sign(
            {
                tenantId: tenant.ID,
                subdomain: tenant.Subdomain,
                email: tenant.Email,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "1d" }
        );



        return {
            message: "Login successful",
            token,
            tenant: {
                company: tenant.CompanyName,
                subdomain: tenant.Subdomain,
                domain: tenant.Domain,
                isSubscriptionValid
            },
        };
    }

    static async signUp({
        firstName,
        lastName,
        companyName,
        email,
        password,
        subdomain,
        domain,
        planId,
        subscription
    }: {
        firstName: string;
        lastName: string;
        companyName: string;
        email: string;
        password: string;
        subdomain: string;
        domain: string;
        planId: string;
        subscription: {
            planId: string;
            stripeSubscriptionId: string;
            stripeCustomerId: string;
            currency: string;
            interval: string;
            amount: number;
            trialDays: number;
            status: string;
            trialEndsAt: string;
        };
    }) {


        if (!companyName || !email || !password) {
            throw new Error(" Missing required fields");
        }

        const existingTenant = await tenantRepo.findByEmail(email);
        if (existingTenant) throw new Error(" Tenant with this email already exists.");

        const hashedPassword = await bcrypt.hash(password, 10);
        domain = `${subdomain}.nestcrm.com.au`;
        subdomain = subdomain.toLowerCase().replace(/\s+/g, "");
        const tenantId = uuidv4();

        let instanceId: string | null = null;
        let targetGroupArn: string | null = null;
        let listenerRuleArn: string | null = null;

        const now = new Date().toISOString();
        const subscriptionId = uuidv4();

        try {
            const newTenant = {
                ID: tenantId,
                FirstName: firstName,
                LastName: lastName,
                CompanyName: companyName,
                Email: email,
                Password: hashedPassword,
                Subdomain: subdomain,
                Domain: domain,
                planId: planId,
                Status: "active",
                CreatedAt: now
            };

            await tenantRepo.create(newTenant);
            await subscriptionRepo.create({
                ID: subscriptionId,
                TenantID: tenantId,
                StripeCustomerID: subscription.stripeCustomerId,
                StripeSubscriptionID: subscription.stripeSubscriptionId,
                PlanID: subscription.planId,
                Currency: subscription.currency,
                Interval: subscription.interval,
                Amount: subscription.amount,
                TrialDays: subscription.trialDays,
                Status: subscription.status,
                StartDate: now,
                CurrentPeriodStart: now,
                CurrentPeriodEnd: subscription.trialEndsAt,
                TrialEndDate: subscription.trialEndsAt,
                CancelAtPeriodEnd: false,
                CanceledAt: null,
                CreatedAt: now,
                UpdatedAt: now
            });

            await createTablesForTenant(subdomain);

            const ec2Instance = await ProvisionEC2.launchInstance(subdomain);
            instanceId = ec2Instance.instanceId;

            const listenerResources = await CreateTargetGroupAndListenerRule.setup(
                subdomain,
                instanceId
            );
            targetGroupArn = listenerResources!.targetGroupArn;
            listenerRuleArn = listenerResources!.listenerRuleArn;

            const token = jwt.sign(
                { tenantId, subdomain, email },
                process.env.JWT_SECRET!,
                { expiresIn: "1d" }
            );

            return {
                message: "Tenant created successfully",
                token,
                instanceId,
                tenant: {
                    company: companyName,
                    subdomain,
                    domain,
                },
            };
        } catch (error) {
            console.error(" Provisioning failed. Rolling back...");

            if (instanceId) await CleanupResources.terminateEC2(instanceId);
            if (targetGroupArn) await CleanupResources.deleteTargetGroup(targetGroupArn);
            if (listenerRuleArn) await CleanupResources.deleteListenerRule(listenerRuleArn);
            await CleanupResources.deleteTenantTables(subdomain);
            await CleanupResources.deleteTenantRecord(tenantId);

            throw new Error(" Tenant provisioning failed and cleanup was triggered.");
        }
    }

    private static isSubscriptionValid(sub?: Subscription): any {
        if (!sub) return false;

        const now = new Date();
        const canceledAt = sub.CanceledAt ? new Date(sub.CanceledAt) : null;

        return (
            (sub.Status === "active" || sub.Status === "trialing") &&
            (!sub.CancelAtPeriodEnd || (canceledAt && canceledAt > now))
        );
    }
}


