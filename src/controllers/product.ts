import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js"
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";
// import { faker } from "@faker-js/faker"

export const newProduct = TryCatch(async (req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
    console.log(req.body)
    const { name, price, stock, category } = req.body;
    console.log(name)
    const photo = req.file;

    if (!photo) return next(new ErrorHandler("Please add photo", 400))

    if (!name || !price || !stock || !category) {
        rm(photo.path, () => {
            console.log('Deleted')
        })
        return next(new ErrorHandler("Please enter all fields", 400))
    }
    await Product.create({
        name, price, stock, category: category.toLowerCase(), photo: photo.path
    })

    await invalidateCache({ product: true });

    return res.status(200).json({
        success: true,
        message: `Product created successfully`
    })
});

// Revalidate on New, update, delete product and new order.
export const getLatestProducts = TryCatch(async (req, res, next) => {
    // const products = await Product.find({});
    let products = []

    if (myCache.has("latest-product")) {
        products = JSON.parse(myCache.get("latest-product") as string);
    } else {
        products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
        myCache.set("latest-product", JSON.stringify(products));
    }

    return res.status(200).json({
        success: true,
        products
    })
});

// Revalidate on New, update, delete product and new order.
export const getAllCategories = TryCatch(async (req, res, next) => {
    let categories = []
    if (myCache.has("categories")) {
        categories = JSON.parse(myCache.get("categories") as string);
    } else {
        categories = await Product.distinct("category");
        myCache.set("categories", JSON.stringify(categories))
    }
    return res.status(200).json({
        success: true,
        categories
    })
});

// Revalidate on New, update, delete product and new order.
export const getAdminProducts = TryCatch(async (req, res, next) => {
    let products;
    if (myCache.has("all-product")) {
        products = JSON.parse(myCache.get("all-product") as string);
    } else {
        products = await Product.find({});
        myCache.set("all-product", JSON.stringify(products));
    }

    return res.status(200).json({
        success: true,
        products
    })
});

// Revalidate on New, update, delete product and new order.
export const getSingleProduct = TryCatch(async (req, res, next) => {
    let product;
    const id = req.params.id
    if (myCache.has(`product-${id}`)) {
        product = JSON.parse(myCache.get(`product-${id}`) as string);
    } else {
        product = await Product.findById(req.params.id);
        myCache.set(`product-${id}`, JSON.stringify(product));
    }

    return res.status(200).json({
        success: true,
        product
    })
});

export const updateProduct = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const { name, price, stock, category } = req.body;
    const photo = req.file;

    const product = await Product.findById(id);
    if (!product) return next(new ErrorHandler("Invalid product id", 400))

    if (photo) {
        rm(product.photo!, () => {
            console.log('old photo deleted')
        })
        product.photo = photo.path;
    }
    if (name) product.name = name;
    if (price) product.price = price;
    if (category) product.category = category;
    if (stock) product.stock = stock;

    await product.save();
    await invalidateCache({ product: true, productId: String(product._id) });

    return res.status(200).json({
        success: true,
        message: `Product updated successfully`
    })
});

export const deleteProduct = TryCatch(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new ErrorHandler("Product not found", 400));

    rm(product.photo!, () => {
        console.log('product photo deleted')
    })
    //delete query
    await product.deleteOne();
    await invalidateCache({ product: true, productId: String(product._id) });

    res.status(200).json({
        success: true,
        message: "product deleted successfully."
    })
});

export const getAllProducts = TryCatch(async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, price, category, sort } = req.query;
    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = limit * (page - 1);
    const baseQuery: BaseQuery = {};
    if (category) {
        baseQuery.category = category
    }
    if (price) {
        // "lte" => less than equal
        baseQuery.price = {
            $lte: Number(price)
        }
    }
    if (search) {
        baseQuery.name = {
            $regex: search,
            $options: "i",
        }
    }
    const productsPromise = await Product.find(baseQuery).sort(sort && { price: sort === "asc" ? 1 : -1 }).limit(limit).skip(skip);
    const [products, filteredOnlyProducts] = await Promise.all([
        productsPromise,
        Product.find(baseQuery)
    ])
    const totalPage = Math.ceil(filteredOnlyProducts.length / limit);
    return res.status(200).json({
        success: true,
        products,
        totalPage
    })
});

// const generateRandomProducts = async (count: number = 10) => {
//     const products = [];

//     for (let i = 0; i < count; i++) {
//         const product = {
//             name: faker.commerce.productName(),
//             photo: "uploads\\5ba9bd91-b89c-40c2-bb8a-66703408f986.png",
//             price: faker.commerce.price({ min: 1500, max: 80000, dec: 0 }),
//             stock: faker.commerce.price({ min: 0, max: 100, dec: 0 }),
//             category: faker.commerce.department(),
//             createdAt: new Date(faker.date.past()),
//             updatedAt: new Date(faker.date.recent()),
//             __v: 0,
//         };

//         products.push(product);
//     }

//     await Product.create(products);

//     console.log({ succecss: true });
// };

// generateRandomProducts(40);

// const deleteRandomsProducts = async (count: number = 10) => {
//   const products = await Product.find({}).skip(2);

//   for (let i = 0; i < products.length; i++) {
//     const product = products[i];
//     await product.deleteOne();
//   }

//   console.log({ succecss: true });
// };

// deleteRandomsProducts(48)