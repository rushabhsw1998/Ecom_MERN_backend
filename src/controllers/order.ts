import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";

export const myOrders = TryCatch(async (req, res, next) => {
    const { id: user } = req.query;
    let orders = [];
    const key = `my-orders-${user}`;
    if (myCache.has(key)) {
        orders = JSON.parse(myCache.get(key) as string);
    } else {
        orders = await Order.find({ user });
        myCache.set(key, JSON.stringify(orders));
    }
    return res.status(200).json({
        success: true,
        orders
    })
})

export const allOrders = TryCatch(async (req, res, next) => {
    const key = `all-orders`;
    let orders = [];
    if (myCache.has(key)) {
        orders = JSON.parse(myCache.get(key) as string);
    } else {
        orders = await Order.find().populate("user", "name");
        myCache.set(key, JSON.stringify(orders));
    }
    return res.status(200).json({
        success: true,
        orders
    })
})

// Revalidate on New, update, delete order and new order.
export const getSingleOrder = TryCatch(async (req, res, next) => {
    let order;
    const id = req.params.id
    console.log("id", id)
    const key = `order-${id}`
    if (!id) return next(new ErrorHandler("Order Id not found.", 404));
    if (myCache.has(key)) {
        order = JSON.parse(myCache.get(key) as string);
    } else {
        order = await Order.findById(req.params.id);
        console.log("order", order);
        if (!order) return next(new ErrorHandler("Order not found.", 404));
        myCache.set(key, JSON.stringify(order));
    }

    return res.status(200).json({
        success: true,
        order
    })
});

export const newOrder = TryCatch(async (req: Request<{}, {}, NewOrderRequestBody>, res: Response, next: NextFunction) => {
    const { shippingInfo, orderItems, user, subtotal, tax, shippingCharges, discount, total } = req.body
    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total) {
        return (next(new ErrorHandler("Please enter all fields", 400)));
    }
    const order = await Order.create({ shippingInfo, orderItems, user, subtotal, tax, shippingCharges, discount, total });
    await reduceStock(orderItems);
    invalidateCache({ "product": true, "order": true, "admin": true, "userId": user, "productId": order.orderItems.map(i => String(i.productId)) });
    return res.status(201).json({
        success: true,
        message: "Order placed successfully"
    })
})

export const processOrder = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return next(new ErrorHandler("Order not found", 404));

    switch (order.status) {
        case "Processing":
            order.status = "Shipped";
            break;
        case "Shipped":
            order.status = "Delivered";
            break;
        default:
            order.status = "Delivered";
            break;
    }
    await order.save();
    invalidateCache({ "product": false, "order": true, "admin": true, "userId": order.user, "orderId": String(order._id) });
    return res.status(201).json({
        success: true,
        message: "Order processed successfully."
    })
})

export const deleteOrder = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return next(new ErrorHandler("Order not found", 404));

    await order.deleteOne();
    invalidateCache({ "product": false, "order": true, "admin": true, "userId": order.user, "orderId": String(order._id) });
    return res.status(201).json({
        success: true,
        message: "Order deleted successfully."
    })
})