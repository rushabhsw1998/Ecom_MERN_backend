import mongoose from 'mongoose';
import validator from "validator";

interface IUser extends Document {
    _id: string;
    name: string;
    email: string;
    photo: string;
    role: "admin" | "user";
    gender: "male" | "female";
    dob: Date;
    createdAt: Date;
    updatedAt: Date;
    //   Virtual Attribute
    age: number;
  }

const schema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: [true, "Please enter ID"],
        },
        name: {
            type: String,
            required: [true, "Please enter Name"],
        },
        email: {
            type: String,
            unique: [true, "Email already Exist"],
            required: [true, "Please enter Name"],
            validate: validator.default.isEmail,
        },
        photo: {
            type: String,
            required: [true, "Please add Photo"],
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user",
        },
        gender: {
            type: String,
            enum: ["male", "female"],
            required: [true, "Please enter Gender"],
        },
        dob: {
            type: Date,
            required: [true, "Please enter Date of birth"],
        },
    },
    {
        timestamps: true,
    }
);

//"mongoose.Schema.virtual" document properties that are not stored in the MongoDB database but are computed dynamically based on other fields within the document.
// Ex. firstNM and lastNM are field in schema then also we get full name "fisrtNM lastNM".
schema.virtual('age').get(function () {
    const today = new Date(); // 09/08/2025
    const dob = this.dob; // 03/07/1998
    let age = today.getFullYear() - dob.getFullYear(); // 2025-1998: age = 27
    // 8 < 7 || (8 == 7 && 09 < 03)
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
})

export const User = mongoose.model<IUser>("User", schema);

