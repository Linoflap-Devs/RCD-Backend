import { db } from "../db/db"
import { Selectable } from "kysely"
import { QueryResult } from "../types/global.types"
import { IImage, IImageBase64, IImageR2 } from "../types/image.types"
import { TblImage } from "../db/db-types"
import { bufferToBase64 } from "../utils/utils"


export const addImage = async (imageData: IImageR2): QueryResult<Selectable<TblImage>> => {
    try {

        const addImage = await db.insertInto('Tbl_Image')
            .values({
                ContentType: imageData.ContentType,
                FileExtension: imageData.FileExt,
                Filename: imageData.FileName,
                FileSize: imageData.FileSize,
                CreatedAt: new Date()
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: addImage
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as Selectable<TblImage>,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}



export const editImage = async (imageId: number, imageData: IImage): QueryResult<IImageBase64> => {
    try {

        const imageMapped = {
            ContentType: imageData.ContentType,
            FileContent: imageData.FileContent,
            FileExtension: imageData.FileExt,
            Filename: imageData.FileName,
            FileSize: imageData.FileSize,
            StorageKey: imageData.StorageKey
        };

        const result = await db.updateTable('Tbl_Image')
            .where('ImageID', '=', imageId)
            .set(imageMapped)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        const obj = {
            ContentType: result.ContentType,
            CreatedAt: result.CreatedAt,
            FileContent: result.FileContent ? `data:${result.ContentType};base64,${bufferToBase64(result.FileContent)}` : '',
            FileExt: result.FileExtension,
            FileName: result.Filename,
            FileSize: result.FileSize,
            ImageID: result.ImageID
        }

        return {
            success: true,
            data: obj
        }
    }

    catch (err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as IImageBase64,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}