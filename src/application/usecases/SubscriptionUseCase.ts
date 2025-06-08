import { TenantRepository } from "../../domain/repositories/TenantRepository";
import { SubscriptionRepository } from "../../domain/repositories/SubscriptionRepository";
import { SubscriptionStatus } from "../../domain/entities/Subscription";

export class SubscriptionUseCase {
    constructor(
        private tenantRepo: TenantRepository,
        private subscriptionRepo: SubscriptionRepository
    ) {}

    async checkSubscriptionStatus(subdomain: string): Promise<SubscriptionStatus> {
        const tenant = await this.tenantRepo.findBySubdomain(subdomain);
        if (!tenant) {
            return { valid: false, plan: "", status: "not_found", expiresAt: "" };
        }

        const [subscription] = await this.subscriptionRepo.findByTenantID(tenant.ID);
        if (!subscription) {
            return { valid: false, plan: "", status: "not_subscribed", expiresAt: "" };
        }

        const now = Date.now();
        const trialEnd = new Date(subscription.CurrentPeriodStart).getTime() +
                         subscription.TrialDays * 86400000;

        const isActive = (subscription.Status === "active" || subscription.Status === "trialing") &&
                         !subscription.CancelAtPeriodEnd &&
                         (!subscription.CanceledAt || new Date(subscription.CanceledAt).getTime() > now);

        return {
            valid: isActive,
            plan: subscription.PlanID,
            status: subscription.Status,
            expiresAt: new Date(trialEnd).toISOString()
        };
    }
}
