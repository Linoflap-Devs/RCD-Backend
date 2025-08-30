import multer from "multer";
import { Request } from "express";

const memStore = multer.memoryStorage()

export const multerUpload = multer({
    storage: memStore,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
        if(file.mimetype.startsWith('image/')){
            callback(null, true)
        }
        else {
            callback(new Error("Not an image."))
        }
    }
})