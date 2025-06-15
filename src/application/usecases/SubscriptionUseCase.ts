import { TenantRepository } from "../../domain/repositories/TenantRepository";
import { SubscriptionRepository } from "../../domain/repositories/SubscriptionRepository";
import { SubscriptionStatus } from "../../domain/entities/Subscription";

const MS_PER_DAY = 86400000;

export class SubscriptionUseCase {
    constructor(
        private tenantRepo: TenantRepository,
        private subscriptionRepo: SubscriptionRepository
    ) {}

    async checkSubscriptionStatus(subdomain: string): Promise<SubscriptionStatus> {
        const tenant = await this.tenantRepo.findBySubdomain(subdomain);
        if (!tenant) {
            return this.createResponse(false, "", "not_found", "");
        }

        const [subscription] = await this.subscriptionRepo.findByTenantID(tenant.ID);
        if (!subscription) {
            return this.createResponse(false, "", "not_subscribed", "");
        }

        const now = Date.now();
        const trialEnd = new Date(subscription.CurrentPeriodStart).getTime() + 
                         subscription.TrialDays * MS_PER_DAY;

        const isActive = this.isSubscriptionActive(subscription, now);

        return {
            valid: isActive,
            plan: subscription.PlanID,
            status: subscription.Status,
            expiresAt: new Date(trialEnd).toISOString()
        };
    }

    private createResponse(valid: boolean, plan: string, status: string, expiresAt: string): SubscriptionStatus {
        return { valid, plan, status, expiresAt };
    }

    private isSubscriptionActive(subscription: any, now: number): boolean {
        return (subscription.Status === "active" || subscription.Status === "trialing") &&
               !subscription.CancelAtPeriodEnd &&
               (!subscription.CanceledAt || new Date(subscription.CanceledAt).getTime() > now);
    }
}
