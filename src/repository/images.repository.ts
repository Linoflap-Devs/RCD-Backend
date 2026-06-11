import { db } from "../db/db"
import { Selectable } from "kysely"
import { QueryResult } from "../types/global.types"
import { IImage, IImageBase64, IImageR2 } from "../types/image.types"
import { TblImage, TblSalesTranImage } from "../db/db-types"
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
            ImageID: result.ImageID, 
            ImageType: result.Filename.includes('receipt') ? 'receipt' : result.Filename.includes('agreement') ? 'agreement' : 'other'
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

export const getSaleTranImages = async (
    filters?: {
        saleTranId?: number,
        pendingSalesId?: number,
    }
): QueryResult<Selectable<TblSalesTranImage>[]> => {
    try {
        let baseQuery = await db.selectFrom('Tbl_SalesTranImage')
            .selectAll()

        if(filters && filters.saleTranId){
            baseQuery = baseQuery.where('SalesTransID', '=', filters.saleTranId)
        }

        if(filters && filters.pendingSalesId){
            baseQuery = baseQuery.where('PendingSalesTransID', '=', filters.pendingSalesId)
        }

        const result = await baseQuery.execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as Selectable<TblSalesTranImage>[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const deleteSaleTranImages = async (
    target: {
        pendingSalesId?: number,
        salesTranId?: number,
        imageId?: number[]
    }
): QueryResult<Selectable<TblSalesTranImage>[]> => {

    if(!target.imageId && !target.pendingSalesId && !target.salesTranId){
        return {
            success: false,
            data: [] as Selectable<TblSalesTranImage>[],
            error: {
                code: 400,
                message: "Missing sale transaction id or pending sales transaction id."
            }
        }
    }

    try {
        let baseQuery = await db.deleteFrom('Tbl_SalesTranImage')

        if(target.salesTranId){
            baseQuery = baseQuery.where('SalesTransID', '=', target.salesTranId)
        }

        if(target.pendingSalesId){
            baseQuery = baseQuery.where('PendingSalesTransID', '=', target.pendingSalesId)
        }

        if(target.imageId){
            baseQuery = baseQuery.where('ImageID', 'in', target.imageId)
        }

        const result = await baseQuery.outputAll('deleted').execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as Selectable<TblSalesTranImage>[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}