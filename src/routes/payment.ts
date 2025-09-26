import express from "express";
import { allCoupons, applyDiscount, createPaymentIntent, deleteCoupon, newCoupon } from "../controllers/payment.js";
import { adminOnly } from "../middlewares/auth.js";
const app = express.Router();

// route - /api/v1/payment/create
app.post("/create", createPaymentIntent);

// route - /api/v1/payment/coupon/new
app.get("/discount", applyDiscount);

// route - /api/v1/payment/coupon/new
app.post("/coupon/new", adminOnly, newCoupon);

// route - /api/v1/payment/coupon/new
app.get("/coupon/all", adminOnly, allCoupons);

// route - /api/v1/payment/coupon/new
app.delete("/coupon/:id", adminOnly, deleteCoupon);

export default app;