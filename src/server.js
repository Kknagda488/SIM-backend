
import dotenv from "dotenv"
import connectDB from "./database/mongo_connector.js"

import {app} from './app.js'
dotenv.config()
const port = process.env.PORT || 3000


connectDB()
.then(() => {
    app.listen(port, () => {
        console.log(`Server is running at port : ${port}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})

