import { Request, Response } from "express";
import { TenantRepositoryImpl } from "../../infrastructure/database/TenantRepositoryImpl";
import { SubscriptionRepositoryImpl } from "../../infrastructure/database/SubscriptionRepositoryImpl";
import { SubscriptionUseCase } from "../../application/usecases/SubscriptionUseCase";
import { isAuthorized } from "../../utils/isAuthorized";

const subscriptionUseCase = new SubscriptionUseCase(
    new TenantRepositoryImpl(),
    new SubscriptionRepositoryImpl()
);

export class SubscriptionController {
    static async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const token = req.query.token as string;
            const subdomain = req.query.subdomain as string;

            if (!token || !isAuthorized(token)) {
                res.status(401).json({ valid: false, error: "Unauthorized request" });
                return;
            }

            if (!subdomain) {
                res.status(400).json({ valid: false, error: "Missing subdomain" });
                return;
            }

            const result = await subscriptionUseCase.checkSubscriptionStatus(subdomain);
            res.status(result.valid ? 200 : 404).json(result);
        } catch (error) {
            res.status(500).json({ valid: false, error: "Internal server error" });
        }
    }
}
