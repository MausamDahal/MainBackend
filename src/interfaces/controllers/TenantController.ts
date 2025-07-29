import { Request, Response } from "express";
import { TenantUseCase } from "../../application/usecases/TenantUseCase";

export class TenantController {
    static async signUp(req: Request, res: Response) {
        try {
 // Support both GET (req.query) and POST (req.body)
            const data = Object.keys(req.body).length ? req.body : req.query;
            const response = await TenantUseCase.signUp(data as any);
            res
                .cookie("token", response.token, {
                    domain: ".mausamcrm.site",
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
                    domain: ".mausamcrm.site",
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
