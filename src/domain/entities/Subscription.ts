export interface Subscription {
    ID: string;
    TenantID: string;
    StripeCustomerID: string;
    StripeSubscriptionID: string;
    PlanID: string;
    Currency: string;
    Interval: string;
    Amount: number;
    TrialDays: number;
    Status: string;
    StartDate: string;
    CurrentPeriodStart: string;
    CurrentPeriodEnd: string;
    TrialEndDate: string;
    CancelAtPeriodEnd: boolean;
    CanceledAt: string | null;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface SubscriptionStatus {
    valid: boolean;
    plan: string;
    status: string;
    expiresAt: string;
}