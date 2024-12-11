class ApiError {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ){
        this.statusCode = statusCode
        this.message = message
        this.data = null
        this.success = false;
        this.errors = errors
        this.stack = stack

    }
}

export {ApiError}