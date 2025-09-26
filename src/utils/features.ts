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
    if (admin) {
        myCache.del([
            "admin-stats",
            "admin-pie-charts",
            "admin-bar-charts",
            "admin-line-charts"
        ])
    }
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

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
    if (lastMonth === 0) {
        return (thisMonth * 100);
    }
    const percentage = (thisMonth / lastMonth) * 100;
    // const percentage = ((thisMonth - lastMonth) / lastMonth) * 100;
    return Number(percentage.toFixed(0));
}

export const getInventories = async ({ categories, productsCount }: { categories: string[], productsCount: number }) => {
    const categoriesCountPromise = categories.map(category => Product.countDocuments({ category }))
    const categoriesCount = await Promise.all(categoriesCountPromise)
    const categoryCount: Record<string, number>[] = []
    categories.forEach((category, i) => {
        categoryCount.push({
            [category]: Math.round((categoriesCount[i] / productsCount) * 100)
        })
    })
    return categoryCount;
}

interface MyDocument extends mongoose.Document {
    createdAt: Date
    discount?: number
    total?: number
}

type FuncProp = {
    length: number
    docArr: MyDocument[]
    today: Date
    property?: "discount" | "total"
}

export const getChartData = ({ length, docArr, today, property }: FuncProp) => {
    const data: number[] = new Array(length).fill(0);

    docArr.forEach(i => {
        const creationDate = i.createdAt;
        const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
        if (monthDiff < length) {
            if (property) {
                data[length - monthDiff - 1] += i[property]!;
            } else {
                data[length - monthDiff - 1] += 1;
            }
        }
    })
    return data;
}