import { Request, Response } from "express";
import { TenantUseCase } from "../../application/usecases/TenantUseCase";

export class TenantController {
    static async signUp(req: Request, res: Response) {
        try {
            const response = await TenantUseCase.signUp(req.body);
            res
                .cookie("token", response.token, {
                    domain: ".nestcrm.com.au",
                    httpOnly: true,
                    sameSite: "none",
                    secure: true,
                    maxAge: 1000 * 60 * 60 * 24
                })
                .status(201)
                .json({
                    message: "Login successful",
                    tenant: response.tenant,
                });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const response = await TenantUseCase.login(req.body);
            res
                .cookie("token", response.token, {
                    domain: ".nestcrm.com.au",
                    httpOnly: true,
                    sameSite: "none",
                    secure: true,
                    maxAge: 1000 * 60 * 60 * 24
                })
                .status(200)
                .json({
                    message: "Login successful",
                    tenant: response.tenant,
                });
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }
}
