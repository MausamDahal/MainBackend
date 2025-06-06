import { Router } from "express";
import { TenantController } from "../controllers/TenantController";

const router = Router();
router.post("/signup", TenantController.signUp);
router.post("/login", TenantController.login);

export default router;
