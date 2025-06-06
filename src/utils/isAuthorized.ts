import crypto from "crypto";

export function isAuthorized(token: string): boolean {
    const expected = process.env.SUBSCRIPTION_VALIDATION_SECRET!;
    return crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expected)
    );
}
