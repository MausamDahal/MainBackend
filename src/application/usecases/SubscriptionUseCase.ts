import { SubscriptionRepository } from "../../domain/repositories/subscriptionRepository";
import { Subscription } from "../../domain/types/subscription";
import crypto from "crypto";

const MS_PER_DAY = 86400000;

export class SubscriptionUseCase {
    constructor(private repo: SubscriptionRepository) {}

    async isSubscriptionValid(subdomain: string, tenantId: string): Promise<{
        subscribed: boolean;
        subscription_tier: string;
        subscription_end: string | null;
        status: string;
    }> {
        const subscriptions = await this.repo.getByTenantId(
            subdomain,
            tenantId,
        );
        const activeSub = subscriptions?.[0];

        if (!activeSub) {
            return {
                subscribed: false,
                subscription_tier: "none",
                subscription_end: null,
                status: "not_subscribed",
            };
        }

        const now = Date.now();
        const currentPeriodStart = activeSub.CurrentPeriodStart
            ? new Date(activeSub.CurrentPeriodStart).getTime()
            : new Date(activeSub.CreatedAt).getTime(); // fallback

        const trialDays = activeSub.TrialDays ?? 0;

        const trialEnd = currentPeriodStart + trialDays * MS_PER_DAY;

        // A subscription is valid if:
        // 1. It's active or trialing and not canceled
        // 2. It's canceled but not at period end (still valid until end of period)
        // 3. It's canceled but the canceled date is in the future
        const isSubscribed = this.isSubscriptionActive(activeSub, now) ||
            (activeSub.Status === "canceled" && !activeSub.CancelAtPeriodEnd) ||
            (activeSub.Status === "canceled" && activeSub.CanceledAt !== null &&
                new Date(activeSub.CanceledAt).getTime() > now);
        const subscription_end = Number.isFinite(trialEnd)
            ? new Date(trialEnd).toISOString()
            : null;

        return {
            subscribed: isSubscribed,
            subscription_tier: activeSub.PlanID,
            subscription_end,
            status: activeSub.Status,
        };
    }

    private isSubscriptionActive(
        subscription: Subscription,
        now: number,
    ): boolean {
        return (subscription.Status === "active" ||
            subscription.Status === "trialing") &&
            !subscription.CancelAtPeriodEnd &&
            (!subscription.CanceledAt ||
                new Date(subscription.CanceledAt).getTime() > now);
    }

    async upsertSubscription(
        subdomain: string,
        tenantId: string,
        payload: Partial<Subscription>,
    ) {
        const now = new Date().toISOString();

        // Converter 'plan' para 'PlanID' se vier do frontend
        if (payload.plan && !payload.PlanID) {
            payload.PlanID = payload.plan;
            delete (payload as any).plan;
        }

        const existing = await this.repo.getByTenantId(subdomain, tenantId);
        if (existing.length > 0) {
            await this.repo.updateFields(subdomain, tenantId, {
                Status: "active",
                PlanID: payload.PlanID, // atualiza o plano existente
                UpdatedAt: now,
            });
        } else {
            const sub: Subscription = {
                ID: crypto.randomUUID(),
                TenantID: tenantId,
                CreatedAt: now,
                UpdatedAt: now,
                CancelAtPeriodEnd: false,
                CanceledAt: null,
                ...payload,
            } as Subscription;
            await this.repo.save(subdomain, sub);
        }
    }

    async switchSubscription(
        subdomain: string,
        tenantId: string,
        newPlanId: string,
        immediate: boolean = false,
    ): Promise<void> {
        const subscriptions = await this.repo.getByTenantId(
            subdomain,
            tenantId,
        );
        const currentSub = subscriptions?.[0];

        if (!currentSub) {
            throw new Error("No active subscription found to switch");
        }

        if (currentSub.PlanID === newPlanId) {
            throw new Error("Already subscribed to this plan");
        }

        const now = new Date().toISOString();

        if (immediate) {
            // For immediate switch, create new subscription first
            const newSubscription: Subscription = {
                ...currentSub,
                ID: crypto.randomUUID(),
                PlanID: newPlanId,
                Status: "active",
                StartDate: now,
                CurrentPeriodStart: now,
                CurrentPeriodEnd: this.calculateNextPeriodEnd(
                    currentSub.Interval,
                ),
                CancelAtPeriodEnd: false,
                CanceledAt: null,
                CreatedAt: now,
                UpdatedAt: now,
            };

            // Save the new subscription
            await this.repo.save(subdomain, newSubscription);

            // Then mark old subscription as canceled
            await this.repo.updateFields(subdomain, tenantId, {
                Status: "canceled",
                CanceledAt: now,
                UpdatedAt: now,
            });

            // Verify the switch
            const updatedSubs = await this.repo.getByTenantId(
                subdomain,
                tenantId,
            );
            const activeSub = updatedSubs?.[0];
            if (!activeSub || activeSub.PlanID !== newPlanId) {
                throw new Error("Failed to switch subscription plan");
            }
        } else {
            // Schedule the switch for the end of the current period
            await this.repo.updateFields(subdomain, tenantId, {
                CancelAtPeriodEnd: true,
                UpdatedAt: now,
            });
        }
    }

    async cancelSubscription(
        subdomain: string,
        tenantId: string,
        immediate: boolean = false,
    ): Promise<void> {
        const subscriptions = await this.repo.getByTenantId(
            subdomain,
            tenantId,
        );
        const currentSub = subscriptions?.[0];

        if (!currentSub) {
            throw new Error("No active subscription found to cancel");
        }

        const now = new Date().toISOString();

        if (immediate) {
            // If immediate, mark as canceled and set cancel date
            await this.repo.updateFields(subdomain, tenantId, {
                Status: "canceled",
                CanceledAt: now,
                UpdatedAt: now,
            });
        } else {
            // If not immediate, only set CancelAtPeriodEnd to true
            await this.repo.updateFields(subdomain, tenantId, {
                CancelAtPeriodEnd: true,
                UpdatedAt: now,
            });
        }
    }

    private calculateNextPeriodEnd(interval: string): string {
        const now = new Date();
        switch (interval.toLowerCase()) {
            case "month":
                now.setMonth(now.getMonth() + 1);
                break;
            case "year":
                now.setFullYear(now.getFullYear() + 1);
                break;
            default:
                now.setDate(now.getDate() + 30); // Default to 30 days
        }
        return now.toISOString();
    }

    async updateSubscription(
        subdomain: string,
        tenantId: string,
        updateFields: Partial<Subscription>,
    ): Promise<void> {
        const subscriptions = await this.repo.getByTenantId(
            subdomain,
            tenantId,
        );
        const currentSub = subscriptions?.[0];
        if (!currentSub) {
            throw new Error("No active subscription found to update");
        }

        if (!updateFields.Status) {
            throw new Error("Status is required to update the subscription");
        }

        await this.repo.updateStatus(subdomain, tenantId, updateFields.Status);
    }
}