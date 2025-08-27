import { User } from "../models/user.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";

// middleware to make sure only admin allowed
export const adminOnly = TryCatch(async (req, res, next) => {

    const { id } = req.query;

    if(!id) return next(new ErrorHandler("Please provide id.", 401));
    const user = await User.findById(id);
    if(!user) return next(new ErrorHandler("Given id is not valid.", 401));

    if(user.role !== 'admin') return next(new ErrorHandler("User is not admin.",401));
    
    next();
})