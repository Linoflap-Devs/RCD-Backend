import { db } from "../db/db"
import { TblBrokerRegistration, TblBrokerWorkExp } from "../db/db-types"
import { ITblBrokerUser } from "../types/auth.types"
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

export const editBroker = async (userId: number, brokerId: number, data: Partial<ITblBroker>): QueryResult<ITblBroker> => {
    try {   
        const updateData = {
            ...data,
            LastUpdate: new Date(),
            Broker: data.RepresentativeName || undefined,
            UpdateBy: userId
        }

        const result = await db.updateTable('Tbl_Broker')
            .where('BrokerID', '=', brokerId)
            .set(updateData)
            .outputAll('inserted')
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

export const deleteBroker = async (userId: number, brokerId: number): QueryResult<ITblBroker> => {
    try {
        const result = await db.updateTable('Tbl_Broker')
            .where('BrokerID', '=', brokerId)
            .set({
                UpdateBy: userId,
                LastUpdate: new Date(),
                IsActive: 0
            })
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
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

export const getBrokerWithRegistration = async (brokerId: number): QueryResult<ITblBroker & ITblBrokerRegistration & ITblBrokerUser> => {
    try {
        const brokerResult = await db.selectFrom('Tbl_Broker')
            .innerJoin('Tbl_BrokerUser'  , 'Tbl_Broker.BrokerID', 'Tbl_BrokerUser.BrokerID')
            .innerJoin('Tbl_BrokerRegistration', 'Tbl_BrokerUser.BrokerRegistrationID', 'Tbl_BrokerRegistration.BrokerRegistrationID')
            .selectAll()
            .where('Tbl_Broker.BrokerID', '=', brokerId)
            .executeTakeFirstOrThrow();

        if (!brokerResult) {
            return {
                success: false,
                data: {} as (ITblBroker & ITblBrokerRegistration & ITblBrokerUser),
                error: {
                    code: 404,
                    message: 'Broker not found'
                }
            }
        }
        
        return {
            success: true,
            data: brokerResult as (ITblBroker & ITblBrokerRegistration & ITblBrokerUser)
        }
            
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as (ITblBroker & ITblBrokerRegistration & ITblBrokerUser),
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getBrokerWithUser = async (agentId: number): QueryResult<{ broker: ITblBroker, user: ITblBrokerUser }> => {
    try {
        const result = await db.selectFrom('Tbl_Broker')
            .innerJoin('Tbl_BrokerUser', 'Tbl_Broker.BrokerID', 'Tbl_BrokerUser.BrokerID')
            .innerJoin('Tbl_Broker', 'Tbl_Broker.BrokerID', 'Tbl_Broker.BrokerID')
            .selectAll('Tbl_Broker')
            .select([
                'Tbl_Broker.Religion',
                'Tbl_BrokerUser.BrokerUserID',
                'Tbl_BrokerUser.BrokerID',
                'Tbl_BrokerUser.BrokerRegistrationID',
                'Tbl_BrokerUser.ImageID',
                'Tbl_BrokerUser.Email',
                'Tbl_BrokerUser.IsVerified'
            ])
            .where('Tbl_Broker.BrokerID', '=', agentId)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: {
                broker: result, // contains both tables due to selectAll
                user: result   // typescript will need proper typing here
            }
        }
    }
    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: { broker: {} as ITblBroker, user: {} as ITblBrokerUser },
            error: {
                code: error.message.includes('no result') ? 404 : 500,
                message: error.message
            }
        }
    }
}

export const getBrokerRegistration = async (filters?: {brokerId?: number, brokerRegistrationId?: number}): QueryResult<ITblBrokerRegistration> => {
    try {
        let registrationQuery = await db.selectFrom('Tbl_BrokerRegistration')
            .innerJoin('Tbl_BrokerUser', 'Tbl_BrokerRegistration.BrokerRegistrationID', 'Tbl_BrokerUser.BrokerRegistrationID')
            .selectAll('Tbl_BrokerRegistration')

        if(filters?.brokerId){
            registrationQuery = registrationQuery.where('Tbl_BrokerUser.BrokerID', '=', filters.brokerId)
        }

        if(filters?.brokerRegistrationId){
            registrationQuery = registrationQuery.where('Tbl_BrokerRegistration.BrokerRegistrationID', '=', filters.brokerRegistrationId)
        }

        const registration = await registrationQuery.executeTakeFirst()

        if(!registration){
            return {
                success: false,
                data: {} as ITblBrokerRegistration,
                error: {
                    message: 'No agent registration found.',
                    code: 404
                }
            }
        }

        return {
            success: true,
            data: registration
        }
        
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as ITblBrokerRegistration,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}


export const getBrokers = async (filters?: { name?: string, showInactive?: boolean, brokerId: number }): QueryResult<ITblBroker[]> => {
    try {
        let result = await db.selectFrom('Tbl_Broker')
            .selectAll()

        if(filters && filters.brokerId){
            result = result.where('BrokerID' , '=', filters.brokerId)
        }

        if(filters && filters.name){
            result = result.where('RepresentativeName', '=', `${filters.name}`)
        }

        if(!filters || !filters.showInactive){
            result = result.where('IsActive', '=', 1)
        }

        const queryResult = await result.execute();

        if(!queryResult){
            throw new Error('No agents found.');
        }

        return {
            success: true,
            data: queryResult
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as ITblBroker[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}
