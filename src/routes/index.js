import express from "express";
import statsRouter from "./stats.js";
import authRouter from "./auth.js";
import categoriesRouter from "./categories.js";
import mediaRouter from "./media.js";
import menuRouter from "./menu.js";
import pagesRouter from "./pages.js";
import postsRouter from "./posts.js";
import settingsRouter from "./settings.js";
import subscriptionsRouter from "./subscriptions.js";
import paymentRouter from "./paymentRoutes.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/media", mediaRouter);
router.use("/menu", menuRouter);
router.use("/pages", pagesRouter);
router.use("/posts", postsRouter);
router.use("/stats", statsRouter);
router.use("/settings", settingsRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/payments", paymentRouter);

export default router;
