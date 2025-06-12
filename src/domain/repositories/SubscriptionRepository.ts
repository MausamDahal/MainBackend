import { Subscription } from "../entities/Subscription";

export interface SubscriptionRepository {
    create(subscription: Subscription): Promise<Subscription>;
    findByTenantID(tenantID: string): Promise<Subscription[]>;
    findByStripeSubscriptionID(stripeId: string): Promise<Subscription | null>;
    updateStatus(stripeId: string, status: string): Promise<void>;
    updateFields(stripeId: string, updateFields: Partial<Subscription>): Promise<void>;
}