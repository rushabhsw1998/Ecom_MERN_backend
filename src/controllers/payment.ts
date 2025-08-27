import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { Coupon } from "../models/coupon.js";


export const newCoupon = TryCatch(async (req, res, next) => {
    const { code, amount } = req.body;
    console.log(code)
    if (!code || !amount)
        return next(new ErrorHandler("Please enter both coupon and amount", 400));

    await Coupon.create({ code, amount });

    return res.status(201).json({
        success: true,
        message: `Coupon ${code} Created Successfully`,
    });
});