import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getLayout } from "../controllers/layout.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getLayout);

export default router;