import express from "express";
import { SubscriptionController } from "../controllers/SubscriptionController";

const router = express.Router();
router.get("/", SubscriptionController.getStatus);

export default router;
