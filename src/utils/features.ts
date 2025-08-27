import mongoose from "mongoose";
import { InvalidateCacheProps, OrderItemType } from "../types/types.js";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";

export const connectDB = (uri: string) => {
    mongoose.connect(uri, {
        dbName: "Ecommerce_24"
    }).then(c => console.log(`DB connected to ${c.connection.host}`)).catch(e => e.console.log(e));
};

export const invalidateCache = async ({ product, order, admin, userId, orderId, productId }: InvalidateCacheProps) => {
    if (product) {
        let productsKeys: string[] = [
            "latest-product",
            "categories",
            "all-product",
            `product-${productId}`
        ]
        // if (typeof productId == "string") {
        //     productsKeys.push(`product-${productId}`)
        // } else {
        //     if (productId && productId?.length > 0) {
        //         productsKeys = [...productsKeys, ...productId?.map(x => `product-${x}`)]
        //     }
        // }
        // // //`product-${id}`
        // // const products = await Product.find({}).select("_id");
        // // products.forEach(i => {
        // //     productsKeys.push(`product-${i._id}`)
        // // })

        if (typeof productId == "string") productsKeys.push(`product-${productId}`);
        if (typeof productId == "object") productId.forEach((i) => productsKeys.push(`product-${i}`));
        myCache.del(productsKeys)
    }
    if (order) {
        const orderKeys: string[] = ["all-orders", `my-orders-${userId}`, `order-${orderId}`]

        // const orders = await Order.find({}).select("_id");
        // orders.forEach(i => {
        //     orderKeys.push(`order-${i._id}`)
        // })

        myCache.del(orderKeys)

    }
    if (admin) { }
}

export const reduceStock = async (orderItems: OrderItemType[]) => {
    for (let index = 0; index < orderItems.length; index++) {
        const order = orderItems[index];
        const product = await Product.findById(order.productId);
        if (!product) throw new Error("Product not found.");
        product.stock -= order.quantity;
        await product.save();
    }

}