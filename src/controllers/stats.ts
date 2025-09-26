import { disconnect } from "process";
import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePercentage, getChartData, getInventories } from "../utils/features.js";

export const getDashboardStats = TryCatch(async (req, res, next) => {
    let stats = {};
    const key = 'admin-stats';
    if (myCache.has(key)) {
        stats = JSON.parse(myCache.get(key) as string);
    } else {
        const today = new Date();
        const sixthMonthAgo = new Date();
        sixthMonthAgo.setMonth(sixthMonthAgo.getMonth() - 6);

        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today
        }
        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0)
        }
        // get products
        const thisMonthProductsPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        })
        const lastMonthProductsPromise = Product.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        })
        // get users
        const thisMonthUsersPromise = User.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        })
        const lastMonthUsersPromise = User.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        })
        // get orders
        const thisMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        })
        const lastMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        })
        const lastSixMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: sixthMonthAgo,
                $lte: today
            }
        })

        const latestTransactionPromise = Order.find({}).select(["orderItems", "discount", "total", "status"]).limit(4);
        const [
            thisMonthProducts,
            lastMonthProducts,
            thisMonthUsers,
            lastMonthUsers,
            thisMonthOrders,
            lastMonthOrders,
            productsCount,
            usersCount,
            allOrders,
            lastSixMonthOrders,
            categories,
            femaleUsersCount,
            latestTransaction
        ] = await Promise.all([
            thisMonthProductsPromise,
            lastMonthProductsPromise,
            thisMonthUsersPromise,
            lastMonthUsersPromise,
            thisMonthOrdersPromise,
            lastMonthOrdersPromise,
            Product.countDocuments(),
            User.countDocuments(),
            Order.find({}).select("total"),
            lastSixMonthOrdersPromise,
            Product.distinct("category"),
            User.countDocuments({ gender: "female" }),
            latestTransactionPromise
        ])

        const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + (order.total || 0), 0);
        const lastMonthRevenue = lastMonthOrders.reduce((total, order) => total + (order.total || 0), 0);

        const changePrecent = {
            revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
            product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length),
            user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
            order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length)
        }

        const revenue = allOrders.reduce((total, order) => total + (order.total || 0), 0);
        const count = {
            revenue,
            user: usersCount,
            product: productsCount,
            order: allOrders.length
        }

        const orderMonthCount = new Array(6).fill(0)
        const orderMonthRevenue = new Array(6).fill(0)

        lastSixMonthOrders.forEach(order => {
            const creationDate = order.createdAt; // if creationDate is feb => "1" as per 0 index
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12; // if today is jun => "5" as per 0 index
            // monthDiff 5-1=> 4
            if (monthDiff < 6) { // if 4 < 6 true
                orderMonthCount[6 - monthDiff - 1] += 1;  // [6-4-1]=> "1" then orderMonthCount[1] will undate a count.
                orderMonthRevenue[6 - monthDiff - 1] += order.total;
            }
        })

        const categoryCount = await getInventories({ categories, productsCount })

        const userRatio = {
            male: usersCount - femaleUsersCount,
            female: femaleUsersCount
        }

        const modifyLatestTrasaction = latestTransaction.map(i => ({
            _id: i._id,
            disconnect: i.discount,
            amount: i.total,
            quantity: i.orderItems.length,
            status: i.status
        }))

        stats = {
            userRatio,
            latestTransaction: modifyLatestTrasaction,
            categoryCount,
            changePrecent,
            count,
            chart: {
                order: orderMonthCount,
                revenue: orderMonthRevenue
            }
        }
        myCache.set(key, JSON.stringify(stats));
    }

    return res.status(200).json({
        success: true,
        stats
    })
})

export const getPieCharts = TryCatch(async (req, res, next) => {
    let charts;
    const key = "admin-pie-charts";
    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    } else {

        const [
            processingOrder,
            shippedOrder,
            deliverdOrder,
            categories,
            productsCount,
            outOfStock,
            allOrders,
            allUsers,
            adminUsers,
            customerUsers
        ] = await Promise.all([
            Order.countDocuments({ status: "Processing" }),
            Order.countDocuments({ status: "Shipped" }),
            Order.countDocuments({ status: "Deliverd" }),
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({ stock: 0 }),
            Order.find().select(["total", "discount", "subtotal", "tax", "shippingCharges"]),
            User.find().select(["dob"]),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "users" })
        ])
        const orderFullfillment = {
            processing: processingOrder,
            shipped: shippedOrder,
            deliverd: deliverdOrder
        }
        const productCategories = await getInventories({ categories, productsCount })
        const stockAvaliability = {
            inStock: productsCount - outOfStock,
            outOfStock: outOfStock
        }

        const grossIncome = allOrders.reduce((prev, order) => prev + (order.total || 0), 0);
        const discount = allOrders.reduce((prev, order) => prev + (order.discount || 0), 0);
        const productionCost = allOrders.reduce((prev, order) => prev + (order.shippingCharges || 0), 0);
        const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);
        const marketingCost = Math.round(grossIncome * (30 / 100)); //30%
        const netMargin = grossIncome - discount - productionCost - burnt - marketingCost

        const revenueDistribution = {
            netMargin,
            discount,
            productionCost,
            burnt,
            marketingCost
        }

        const adminCustomer = {
            admin: adminUsers,
            customer: customerUsers
        }

        const userAgeGroup = {
            teen: allUsers.filter(i => i.age < 20).length,
            adult: allUsers.filter(i => i.age >= 20 && i.age < 40).length,
            old: allUsers.filter(i => i.age >= 40).length
        }

        charts = {
            orderFullfillment,
            productCategories,
            stockAvaliability,
            revenueDistribution,
            userAgeGroup,
            adminCustomer
        }
    }

    myCache.set(key, JSON.stringify(charts))
    return res.status(200).json({
        success: true,
        charts
    })
})

export const getBarCharts = TryCatch(async (req, res, next) => {
    let charts
    const key = "admin-bar-charts"

    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    } else {
        const today = new Date();

        const twelveMonthAgo = new Date();
        twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12);
        const baseQuery = {
            createdAt: {
                $gte: twelveMonthAgo,
                $lte: today
            }
        }
        const [twelveMonthProducts, twelveMonthUsers, twelveMonthOrders] = await Promise.all([
            Product.find(baseQuery).select("createdAt"),
            User.find(baseQuery).select("createdAt"),
            Order.find(baseQuery).select("createdAt")
        ])

        const productCount = getChartData({ length: 12, docArr: twelveMonthProducts, today })
        const userCount = getChartData({ length: 12, docArr: twelveMonthUsers, today })
        const orderCount = getChartData({ length: 12, docArr: twelveMonthOrders, today })

        charts = {
            productCount: productCount,
            user: userCount,
            order: orderCount
        }
    }
    myCache.set(key, JSON.stringify(charts))
    return res.status(200).json({
        success: true,
        charts
    })
})

export const getLineCharts = TryCatch(async (req, res, next) => {
    let charts
    const key = "admin-line-charts"

    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    } else {
        const today = new Date();
        const sixthMonthAgo = new Date();
        sixthMonthAgo.setMonth(sixthMonthAgo.getMonth() - 6);

        const twelveMonthAgo = new Date();
        twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12);

        const sixMonthProductPromise = Product.find({
            createdAt: {
                $gte: sixthMonthAgo,
                $lte: today
            }
        }).select("createdAt");

        const sixMonthUserPromise = User.find({
            createdAt: {
                $gte: sixthMonthAgo,
                $lte: today
            }
        }).select("createdAt");

        const twelveMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthAgo,
                $lte: today
            }
        }).select(["createdAt", "discount", "total"]);

        const [
            sixMonthProducts,
            sixMonthUsers,
            twelveMonthOrders
        ] = await Promise.all([
            sixMonthProductPromise,
            sixMonthUserPromise,
            twelveMonthOrdersPromise
        ])

        const productCount = getChartData({ length: 6, docArr: sixMonthProducts, today })
        const userCount = getChartData({ length: 6, docArr: sixMonthUsers, today })
        const discount = getChartData({ length: 12, docArr: twelveMonthOrders, today, property: "discount" })
        const revenue = getChartData({ length: 12, docArr: twelveMonthOrders, today, property: "total" })

        charts = {
            productCount: productCount,
            user: userCount,
            discount,
            revenue
        }
    }
    myCache.set(key, JSON.stringify(charts))
    return res.status(200).json({
        success: true,
        charts
    })
})