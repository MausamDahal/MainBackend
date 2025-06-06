import { Request, Response } from "express";
import { TenantRepositoryImpl } from "../../infrastructure/database/TenantRepositoryImpl";
import { SubscriptionRepositoryImpl } from "../../infrastructure/database/SubscriptionRepositoryImpl";
import { SubscriptionUseCase } from "../../application/usecases/SubscriptionUseCase";
import { isAuthorized } from "../../utils/isAuthorized";

const useCase = new SubscriptionUseCase(
    new TenantRepositoryImpl(),
    new SubscriptionRepositoryImpl()
);

export class SubscriptionController {
    static async getStatus(req: Request, res: Response): Promise<void> {
        const token = req.query.token as string;
        if (!token || !isAuthorized(token)) {
            res.status(401).json({ valid: false, error: "Unauthorized request" });
            return;
        }

        const subdomain = req.query.subdomain as string;
        if (!subdomain) {
            res.status(400).json({ error: "Missing subdomain" });
            return;
        }

        const result = await useCase.checkSubscriptionStatus(subdomain);
        res.status(result.valid ? 200 : 404).json(result);
    }
}

