import 'dotenv/config'

export const logger = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp}: ${message}`;
    if (data && Object.keys(data).length > 0) {
        logMessage += ` ${JSON.stringify(data)}`;
    }
    logMessage += '\n';

    if(process.env.NODE_ENV === 'development') {
        console.log(logMessage)
    }
}