import colors from "colors";

// server helper to reduce redundant typing
export function logMessage(msg: string, flag: 'log' | 'error') {
    switch (flag) {
        case "log": {
            /// Message is a pure logging function
            console.log(colors.green(msg));
            break;
        }
        case "error": {
            /// Message is for logging an error, similar to log.error
            console.log(colors.red(msg));
            break;
        }
        default: {
            // never
        }
    }
}