import User from '../models/user/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import jwt from "jsonwebtoken"
export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "")
        
        // console.log(token);
        if (!token) {
            return res.status(401).json(new ApiError(401, "Unauthorized request"))
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            return res.status(401).json( new ApiError(401, "Invalid Access Token"))
        }
    
        req.user = user;
        next()
    } catch (error) {
        return res.status(401).json( new ApiError(401, error?.message || "Invalid access token"))
    }
};