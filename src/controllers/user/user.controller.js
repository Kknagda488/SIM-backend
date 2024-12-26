import jwt from "jsonwebtoken";
import User from "../../models/user/User.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const generateAccessAndRefereshTokens = async(userId,res) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
    } catch (error) {
        return res.status(400).json( new ApiError(500, "Something went wrong while generating referesh and access token"))
    }
}

export const createUser = async (req, res) => {
    try {
        const {name,mobileNumber, email, password } = req.body

        // if ([firstName, lastName, mobileNumber, email, password].some(field => typeof field !== 'string' || field.trim() === "")) {
        //     return res.status(400).json(new ApiError(400, "All fields are required."));
        // }        
        

        const existedUser = await User.findOne({email })
    
        if (existedUser) {
            return res.status(409).json({message:"User with email already exists"})
        }

        const user = await User.create({
            name,
            email, 
            mobileNumber,
            password,
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken "
        )
        if (!createdUser) {
            return res.status(500).json({message: "Something went wrong while registering the user"})
        }
        const token = jwt.sign({
            id: createdUser._id,
            email: createdUser.email
        }, process.env.ACCESS_TOKEN_SECRET);

        res.status(201).json(
            new ApiResponse(200,{user:createdUser,token},"User created successfully")
        );
    } catch (error) {
        return res.status(500).json({error:error?.message, message:"Error creating user"});
    }
};

export const getUserProfile = async (req, res) => {
    try {
        console.log("api called");
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error: error.message });
    }
};


export const loginUser = asyncHandler(async (req,res) =>{
    const {email, password} = req.body
    console.log(email);
    if (!password && !email) {
        return res.status(400).json(new ApiError(400,"password or email is required"))
    }
    

    const user = await User.findOne({email})

    if (!user) {
        // return res.status(404).json({message: "User does not exist"})
        return res.status(404).json(new ApiError(404,"User Not Found !!"))    
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
     return res.status(401).json(new ApiError(401,"Invalid user credentials"))
     }
     const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id,res)

     let loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    //  let obj = {
    //     name: 
    //  }
     return res
     .status(200)
     .json(
         new ApiResponse(
             200, 
             {
                user:loggedInUser , accessToken, refreshToken
             },
             "User logged In Successfully"
         )
     )

})

export const refreshAccessToken = async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        return res.status(401).json(new ApiError(401,"unauthorized request"))
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            return res.status(401).json(new ApiError(400,"Invalid refresh token"))
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            return res.status(401).json(new ApiError(400,"Refresh token is expired or used"))
            
        }
    
    
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id,res)
    
        return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        return res.status(500).json(new ApiError(400,error?.message || "Invalid refresh token"));
    }
}
export const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


export const updatePassword = asyncHandler(async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
  
      // Validate request body
      if (!oldPassword || !newPassword) {
        return res
          .status(400)
          .json(new ApiError(400, "Old password and new password are required"));
      }
  
      // Get the logged-in user (assuming user ID is in `req.user`)
      const userId = req.user._id; // Replace with your auth middleware's user object
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }
  
      // Verify old password
      const isPasswordValid = await user.isPasswordCorrect(oldPassword);
      if (!isPasswordValid) {
        return res.status(401).json(new ApiError(401, "Old password is incorrect"));
      }
  
      // Update password
      user.password = newPassword;
      await user.save();
  
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            null,
            "Password updated successfully"
          )
        );
    } catch (error) {
      next(error);
    }
  });
  