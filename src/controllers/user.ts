import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.js";
import { NewUserRequestBody } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "../middlewares/error.js";

export const newUser = TryCatch(async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction) => {
    // custom error handler
    // return next(new ErrorHandler("my custom error", 402));
    // throw new Error('error')
    console.log("rush")
    const { name, email, photo, gender, _id, dob } = req.body;

    let user = await User.findById(_id);
    if (user) {
        return res.status(200).json({
            success: true,
            message: `Welcome, ${user.name}`
        })
    }

    if (!_id || !name || !email || !photo || !gender || !dob) {
        return next(new ErrorHandler('Please add all fields.', 400))
    }
    user = await User.create({ name, email, photo, gender, _id, dob: new Date() })
    res?.status(201).json({
        success: true,
        message: `Welcome, ${user.name}`
    })

    //// No need this error handlar ////
    // catch (error) {
    //     res?.status(400).json({
    //         success: false,
    //         message: error
    //     })
    // }
})

export const getAllUsers = TryCatch(async (req, res, next) => {
    const users = await User.find({});

    res.status(200).json({
        success: true,
        users,
    })
})

export const getUser = TryCatch(async (req, res, next) => {
    const id = req.params.id;
    const user = await User.findById(id);

    if (!user) return next(new ErrorHandler("Invalid Id", 400));
    res.status(200).json({
        success: true,
        user,
    })
})

export const deleteUser = TryCatch(async (req, res, next) => {
    const id = req.params.id;
    const user = await User.findById(id);

    if (!user) return next(new ErrorHandler("Invalid Id", 400));

    //delete query
    await user.deleteOne();

    res.status(200).json({
        success: true,
        message: "User deleted successfully."
    })
})