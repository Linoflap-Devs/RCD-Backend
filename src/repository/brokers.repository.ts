import { db } from "../db/db"
import { TblBrokerRegistration, TblBrokerWorkExp } from "../db/db-types"
import { IAddBroker, ITblBroker, ITblBrokerEducation, ITblBrokerRegistration, ITblBrokerWorkExp } from "../types/brokers.types"
import { QueryResult } from "../types/global.types"
import { IImage, IImageBase64 } from "../types/image.types"
import { bufferToBase64 } from "../utils/utils"

export const getBrokerRegistrationByUserId = async (brokerUserId: number): QueryResult<ITblBrokerRegistration> => {
    try {
        const brokerUser = await db.selectFrom('Tbl_BrokerUser')
            .where('BrokerUserID', '=', brokerUserId)
            .selectAll()
            .executeTakeFirstOrThrow()
        
        const brokerRegistration = await db.selectFrom('Tbl_BrokerRegistration')
            .where('BrokerRegistrationID', '=', brokerUser.BrokerRegistrationID)
            .selectAll()
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: brokerRegistration
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblBrokerRegistration,
            error: {
                code: 400,
                message: error.message
            },
        }
    }   
}

export const getBrokerWorkExp = async(brokerUserId: number): QueryResult<ITblBrokerWorkExp[]> => {
    try {
         const brokerUser = await db.selectFrom('Tbl_BrokerUser')
            .where('BrokerUserID', '=', brokerUserId)
            .selectAll()
            .executeTakeFirstOrThrow()

        const workExp = await db.selectFrom('Tbl_BrokerWorkExp')
            .where('BrokerRegistrationID', '=', brokerUser.BrokerRegistrationID)
            .selectAll()
            .execute()

        return {
            success: true,
            data: workExp
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblBrokerWorkExp[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getBrokerEducation = async (brokerUserId: number): QueryResult<ITblBrokerEducation[]> => {
    try {
         const brokerUser = await db.selectFrom('Tbl_BrokerUser')
            .where('BrokerUserID', '=', brokerUserId)
            .selectAll()
            .executeTakeFirstOrThrow()

        const educ = await db.selectFrom('Tbl_BrokerEducation')
            .where('BrokerRegistrationID', '=', brokerUser.BrokerRegistrationID)
            .selectAll()
            .execute()

        return {
            success: true,
            data: educ
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblBrokerEducation[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const editBrokerImage = async (imageId: number, imageData: IImage): QueryResult<IImageBase64> => {
    try {

        const imageMapped = {
            ContentType: imageData.ContentType,
            FileContent: imageData.FileContent,
            FileExtension: imageData.FileExt,
            Filename: imageData.FileName,
            FileSize: imageData.FileSize
        };

        const result = await db.updateTable('Tbl_Image')
            .where('ImageID', '=', imageId)
            .set(imageMapped)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        const obj = {
            ContentType: result.ContentType,
            CreatedAt: result.CreatedAt,
            FileContent: `data:${result.ContentType};base64,${bufferToBase64(result.FileContent)}`,
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

export const addBrokerImage = async (brokerId: number, imageData: IImage): QueryResult<IImageBase64> => {

    const trx = await db.startTransaction().execute();
    try {

        const addImage = await trx.insertInto('Tbl_Image')
            .values({
                ContentType: imageData.ContentType,
                FileContent: imageData.FileContent,
                FileExtension: imageData.FileExt,
                Filename: imageData.FileName,
                FileSize: imageData.FileSize,
                CreatedAt: new Date()
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        const updateAgent = trx.updateTable('Tbl_BrokerUser')
            .where('BrokerID', '=', brokerId)
            .set({
                ImageID: addImage.ImageID
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        trx.commit().execute()

        const obj = {
            ContentType: addImage.ContentType,
            CreatedAt: addImage.CreatedAt,
            FileContent: `data:${addImage.ContentType};base64,${bufferToBase64(addImage.FileContent)}`,
            FileExt: addImage.FileExtension,
            FileName: addImage.Filename,
            FileSize: addImage.FileSize,
            ImageID: addImage.ImageID
        }

        return {
            success: true,
            data: obj
        }
        
    }

    catch (err: unknown){
        const error = err as Error
        trx.rollback().execute();
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

export const addBroker = async (userId: number, broker: IAddBroker): QueryResult<ITblBroker> => {
    try {
        const result = await db.insertInto('Tbl_Broker')
            .values({
                BrokerCode: broker.BrokerCode,
                Broker: `${broker.LastName}, ${broker.FirstName} ${broker.MiddleName}`,
                RepresentativeName: `${broker.LastName}, ${broker.FirstName} ${broker.MiddleName}`,
                Birthdate: broker.Birthdate,
                Birthplace: broker.Birthplace || '',
                CivilStatus: broker.CivilStatus,
                Religion: broker.Religion || '',
                Address: broker.Address,
                Sex: broker.Sex,
                ContactNumber: broker.ContactNumber,
                PositionID: broker.PositionID || 5,
                ContactEmergency: broker.ContactEmergency || '',
                PersonEmergency: broker.PersonEmergency || '',
                AddressEmergency: broker.AddressEmergency || '',
                EmployeeIDNumber: broker.EmployeeIDNumber || '',
                PRCNumber: broker.PRCNumber || '',
                PagIbigNumber: broker.PagIbigNumber || '',
                PhilhealthNumber: broker.PhilhealthNumber || '',
                DSHUDNumber: broker.DSHUDNumber || ' ',
                ReferredByID: broker.ReferredByID,
                TelephoneNumber: broker.TelephoneNumber,
                TINNumber: broker.TINNumber || '',
                SSSNumber: broker.SSSNumber || '',
                UpdateBy: userId,
                LastUpdate: new Date(),
                IsActive: 1
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()
        
        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblBroker,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getBrokerByCode = async (code: string): QueryResult<ITblBroker> => {
    try {
        const result = await db.selectFrom('Tbl_Broker')
            .selectAll()
            .where('BrokerCode', '=', code)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as ITblBroker,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}