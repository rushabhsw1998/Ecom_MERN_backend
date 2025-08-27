import express, { NextFunction, Request, Response } from "express";
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from './middlewares/error.js'
import NodeCache from "node-cache";
import { config } from "dotenv";
import morgan from "morgan";
// Importing routes.
import userRoute from "./routes/user.js"
import productRoute from "./routes/products.js"
import orderRoute from "./routes/order.js"
import paymentRoute from "./routes/payment.js";

config({
    path: "./.env"
});

const port = process.env.PORT || 4000;
const mongoURI = process.env.MONGO_URI || "";
connectDB(mongoURI);

export const myCache = new NodeCache();

const app = express();
app.use(express.json());
app.use(morgan("dev"));
// using routes
// "api/v1/" this is prefix for api.
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymentRoute);

app.use("/uploads", express.static("uploads"))
// Error handling middleware
app.use(errorMiddleware)

app.listen(port, () => {
    console.log(`My Server is working on http://localhost:${port}`);
})