import { db } from "../db/db"
import { TblBrokerRegistration, TblBrokerWorkExp } from "../db/db-types"
import { ITblBrokerUser } from "../types/auth.types"
import { IAddBroker, IBrokerRegistration, ITblBroker, ITblBrokerEducation, ITblBrokerRegistration, ITblBrokerWorkExp } from "../types/brokers.types"
import { QueryResult } from "../types/global.types"
import { IImage, IImageBase64, ITypedImageBase64 } from "../types/image.types"
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
                BrokerTaxRate: broker.BrokerTaxRate || 5,
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
                'Tbl_Broker.BrokerTaxRate',
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


export const getBrokers = async (filters?: { name?: string, showInactive?: boolean, brokerId?: number }): QueryResult<ITblBroker[]> => {
    try {
        let result = await db.selectFrom('Tbl_Broker')
            .leftJoin('Tbl_BrokerUser', 'Tbl_Broker.BrokerID', 'Tbl_BrokerUser.BrokerID')
            .leftJoin('Tbl_BrokerRegistration', 'Tbl_BrokerUser.BrokerRegistrationID', 'Tbl_BrokerRegistration.BrokerRegistrationID')
            .selectAll('Tbl_Broker')
            .select('Tbl_BrokerRegistration.BrokerRegistrationID')
            .select('Tbl_BrokerUser.Email')

        if(filters && filters.brokerId){
            result = result.where('Tbl_Broker.BrokerID' , '=', filters.brokerId)
        }

        if(filters && filters.name){
            result = result.where('Tbl_Broker.RepresentativeName', '=', `${filters.name}`)
        }

        if(!filters || !filters.showInactive){
            result = result.where('Tbl_Broker.IsActive', '=', 1)
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

export const getBrokerUsers = async (): QueryResult<ITblBrokerUser[]> => {
    try {   
        const baseQuery = await db.selectFrom('Tbl_BrokerUser')
            .selectAll()

        const result = await baseQuery.execute();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as ITblBrokerUser[],
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

export const getBrokerRegistrations = async (filters?: {brokerRegistrationId?: number}): QueryResult<IBrokerRegistration[]> => {
    try {
        // 1. Get base broker registration data with user info and all three images
        let baseBrokerDataQuery = await db.selectFrom('Tbl_BrokerRegistration')
            .innerJoin('Tbl_BrokerUser', 'Tbl_BrokerUser.BrokerRegistrationID', 'Tbl_BrokerRegistration.BrokerRegistrationID')
            // Join for profile image
            .leftJoin('Tbl_Image as ProfileImage', 'Tbl_BrokerUser.ImageID', 'ProfileImage.ImageID')
            // Join for government ID image
            .leftJoin('Tbl_Image as GovImage', 'Tbl_BrokerRegistration.GovImageID', 'GovImage.ImageID')
            // Join for selfie image
            .leftJoin('Tbl_Image as SelfieImage', 'Tbl_BrokerRegistration.SelfieImageID', 'SelfieImage.ImageID')
            .select([
                'Tbl_BrokerRegistration.BrokerRegistrationID',
                'Tbl_BrokerRegistration.IsVerified',
                'Tbl_BrokerRegistration.FirstName',
                'Tbl_BrokerRegistration.MiddleName', 
                'Tbl_BrokerRegistration.LastName',
                'Tbl_BrokerRegistration.Address',
                'Tbl_BrokerRegistration.Birthdate',
                'Tbl_BrokerRegistration.Birthplace',
                'Tbl_BrokerRegistration.CivilStatus',
                'Tbl_BrokerRegistration.ContactNumber',
                'Tbl_BrokerRegistration.Sex',
                'Tbl_BrokerRegistration.Religion',
                'Tbl_BrokerRegistration.TelephoneNumber',
                'Tbl_BrokerRegistration.SSSNumber',
                'Tbl_BrokerRegistration.PhilhealthNumber',
                'Tbl_BrokerRegistration.PagIbigNumber',
                'Tbl_BrokerRegistration.TINNumber',
                'Tbl_BrokerRegistration.PRCNumber',
                'Tbl_BrokerRegistration.DSHUDNumber',
                'Tbl_BrokerRegistration.EmployeeIDNumber',
                'Tbl_BrokerUser.Email',
                'Tbl_BrokerUser.Password',
                'Tbl_BrokerUser.BrokerID',
                // Profile image fields
                'ProfileImage.Filename as ProfileFilename',
                'ProfileImage.ContentType as ProfileContentType',
                'ProfileImage.FileExtension as ProfileFileExtension',
                'ProfileImage.FileSize as ProfileFileSize',
                'ProfileImage.FileContent as ProfileFileContent',
                // Government ID image fields
                'GovImage.Filename as GovFilename',
                'GovImage.ContentType as GovContentType',
                'GovImage.FileExtension as GovFileExtension',
                'GovImage.FileSize as GovFileSize',
                'GovImage.FileContent as GovFileContent',
                // Selfie image fields
                'SelfieImage.Filename as SelfieFilename',
                'SelfieImage.ContentType as SelfieContentType',
                'SelfieImage.FileExtension as SelfieFileExtension',
                'SelfieImage.FileSize as SelfieFileSize',
                'SelfieImage.FileContent as SelfieFileContent'
            ])

        console.log(filters)
        if(filters && filters.brokerRegistrationId){
            baseBrokerDataQuery = baseBrokerDataQuery.where('Tbl_BrokerRegistration.BrokerRegistrationID', '=', filters.brokerRegistrationId);
        }

        const baseBrokerData = await baseBrokerDataQuery
            .where('Tbl_BrokerRegistration.IsVerified', '=', 0)
            .orderBy('Tbl_BrokerRegistration.BrokerRegistrationID', 'asc')
            .execute();

        if (baseBrokerData.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        console.log("base broker data", baseBrokerData.length)

        const brokerRegistrationIds = baseBrokerData.map(broker => broker.BrokerRegistrationID);

        // 2. Get education data for all brokers in one query
        const educationData = await db.selectFrom('Tbl_BrokerEducation')
            .select([
                'BrokerEducationID',
                'BrokerID',
                'BrokerRegistrationID',
                'Degree',
                'EndDate',
                'School',
                'StartDate'
            ])
            .where('BrokerRegistrationID', 'in', brokerRegistrationIds)
            .execute();

        // 3. Get work experience data for all brokers in one query
        const workExpData = await db.selectFrom('Tbl_BrokerWorkExp')
            .select([
                'BrokerWorkExpID',
                'BrokerID', 
                'BrokerRegistrationID',
                'Company',
                'EndDate',
                'JobTitle',
                'StartDate'
            ])
            .where('BrokerRegistrationID', 'in', brokerRegistrationIds)
            .execute();

        // 4. Create lookup maps for efficient data retrieval
        const educationByBrokerId = educationData.reduce((acc, edu) => {
            if (!acc[edu.BrokerRegistrationID!]) {
                acc[edu.BrokerRegistrationID!] = [];
            }
            acc[edu.BrokerRegistrationID!].push({
                BrokerEducationID: edu.BrokerEducationID,
                Degree: edu.Degree,
                EndDate: edu.EndDate,
                School: edu.School,
                StartDate: edu.StartDate
            });
            return acc;
        }, {} as Record<number, ITblBrokerEducation[]>);

        const workExpByBrokerId = workExpData.reduce((acc, work) => {
            if (!acc[work.BrokerRegistrationID!]) {
                acc[work.BrokerRegistrationID!] = [];
            }
            acc[work.BrokerRegistrationID!].push({
                BrokerWorkExpID: work.BrokerWorkExpID,
                Company: work.Company,
                EndDate: work.EndDate || null,
                JobTitle: work.JobTitle,
                StartDate: work.StartDate
            });
            return acc;
        }, {} as Record<number, ITblBrokerWorkExp[]>);

        // 5. Build the final result array
        const result: IBrokerRegistration[] = baseBrokerData.map(broker => {
            // Build images array
            const images: ITypedImageBase64[] = [];

            // Add profile image
            if (broker.ProfileFileContent) {
                images.push({
                    FileName: broker.ProfileFilename || '',
                    ContentType: broker.ProfileContentType || '',
                    FileExt: broker.ProfileFileExtension || '',
                    FileSize: broker.ProfileFileSize || 0,
                    FileContent: broker.ProfileFileContent.toString('base64'),
                    ImageType: 'profile'
                });
            }

            // Add government ID image
            if (broker.GovFileContent) {
                images.push({
                    FileName: broker.GovFilename || '',
                    ContentType: broker.GovContentType || '',
                    FileExt: broker.GovFileExtension || '',
                    FileSize: broker.GovFileSize || 0,
                    FileContent: broker.GovFileContent.toString('base64'),
                    ImageType: 'govid'
                });
            }

            // Add selfie image
            if (broker.SelfieFileContent) {
                images.push({
                    FileName: broker.SelfieFilename || '',
                    ContentType: broker.SelfieContentType || '',
                    FileExt: broker.SelfieFileExtension || '',
                    FileSize: broker.SelfieFileSize || 0,
                    FileContent: broker.SelfieFileContent.toString('base64'),
                    ImageType: 'selfie'
                });
            }

            return {
                BrokerRegistrationID: broker.BrokerRegistrationID,
                IsVerified: broker.IsVerified,
                FirstName: broker.FirstName,
                MiddleName: broker.MiddleName,
                LastName: broker.LastName,
                Email: broker.Email,
                Gender: broker.Sex as ('Male' | 'Female'),
                CivilStatus: broker.CivilStatus as ('Single' | 'Married'),
                Religion: broker.Religion || '',
                Birthdate: broker.Birthdate,
                Birthplace: broker.Birthplace || '',
                Address: broker.Address,
                TelephoneNumber: broker.TelephoneNumber || '',
                ContactNumber: broker.ContactNumber,
                SssNumber: broker.SSSNumber || '',
                PhilhealthNumber: broker.PhilhealthNumber,
                PagibigNumber: broker.PagIbigNumber,
                TinNumber: broker.TINNumber,
                PrcNumber: broker.PRCNumber,
                DshudNumber: broker.DSHUDNumber,
                EmployeeIdNumber: broker.EmployeeIDNumber,
                Images: images,
                Experience: workExpByBrokerId[broker.BrokerRegistrationID] || [],
                Education: educationByBrokerId[broker.BrokerRegistrationID] || []
            };
        });

        console.log(result)

        return {
            success: true,
            data: result
        };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: [] as IBrokerRegistration[],
            error: {
                code: 500,
                message: error.message
            }
        };
    }
}