import { TenantRepository } from "../../domain/repositories/TenantRepository";
import { SubscriptionRepository } from "../../domain/repositories/SubscriptionRepository";

export class SubscriptionUseCase {
    constructor(
        private tenantRepo: TenantRepository,
        private subscriptionRepo: SubscriptionRepository
    ) { }

    async checkSubscriptionStatus(subdomain: string): Promise<any> {
        const tenant = await this.tenantRepo.findBySubdomain(subdomain);
        if (!tenant) {
            return { valid: false, reason: "Tenant not found" };
        }

        const subscriptions = await this.subscriptionRepo.findByTenantID(tenant.ID);
        const sub = subscriptions[0];
        if (!sub) {
            return { valid: false, reason: "No subscription found" };
        }

        const now = Date.now();
        const trialEndTime = new Date(sub.CurrentPeriodStart).getTime() + sub.TrialDays * 86400000;

        const valid = (sub.Status === "active" || sub.Status === "trialing") &&
            !sub.CancelAtPeriodEnd &&
            (!sub.CanceledAt || new Date(sub.CanceledAt).getTime() > now);

        return {
            valid,
            plan: sub.PlanID,
            status: sub.Status,
            expiresAt: new Date(trialEndTime).toISOString()
        };
    }
}
