import { db } from "../db/db";
import { TblAgents, TblAgentWorkExp, TblBroker, TblImage, TblUsers, TblUsersWeb, VwAgents } from "../db/db-types";
import { ITblAgentUser, ITblBrokerUser, ITblUsersWeb } from "../types/auth.types";
import { IBroker, IBrokerEmailPicture, IBrokerPicture, ITblBroker, ITblBrokerEducation, ITblBrokerWorkExp } from "../types/brokers.types";
import { QueryResult } from "../types/global.types";
import { IImage, IImageBase64, TblImageWithId } from "../types/image.types";
import { IAgent, IAgentEdit, IAgentEducation, IAgentEducationEdit, IAgentPicture, IAgentWorkExp, IAgentWorkExpEdit, VwAgentPicture } from "../types/users.types";
import { mapToEditAgent, mapToEditEducation, mapToEditWorkExp, mapToImageEdit } from "../utils/maps";
import { bufferToBase64 } from "../utils/utils";

export const getUsers = async (): QueryResult<ITblUsersWeb[]> => {
    try {
        const users = await db.selectFrom('Tbl_UsersWeb').selectAll().execute();
        return {
            success: true,
            data: users
        }
    }

    catch (err: any) {
        const error = err as Error
        return {
            success: false,
            data: [],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
    
};

export const getAgentUsers = async (): QueryResult<ITblAgentUser[]> => {
    try {   
        const baseQuery = await db.selectFrom('Tbl_AgentUser')
            .leftJoin('Tbl_Agents', 'Tbl_AgentUser.AgentID', 'Tbl_Agents.AgentID')
            .leftJoin('Tbl_Position', 'Tbl_Agents.PositionID', 'Tbl_Position.PositionID')
            .leftJoin('Tbl_Division', 'Tbl_Agents.DivisionID', 'Tbl_Division.DivisionID')
            .selectAll('Tbl_AgentUser')
            .select([
                'Tbl_Agents.PositionID',
                'Tbl_Agents.DivisionID',
                'Tbl_Position.Position',
                'Tbl_Division.Division'
            ])

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
            data: [] as ITblAgentUser[],
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

export const getAgentDetails = async (agentId: number): QueryResult<IAgent> => {
    try {
        const result = await db.selectFrom('Tbl_Agents')
            .where('AgentID', '=', agentId)
            .selectAll()
            .executeTakeFirstOrThrow();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as IAgent,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getAgentWorkExp = async (agentId: number): QueryResult<IAgentWorkExp[]> => {
    try {
        const result = await db.selectFrom('Tbl_AgentWorkExp')
            .where('AgentID', '=', agentId)
            .selectAll()
            .execute();
        
        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as IAgentWorkExp[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getAgentEducation = async (agentId: number): QueryResult<IAgentEducation[]> => {
    try {
        const result = await db.selectFrom('Tbl_AgentEducation')
            .where('AgentID', '=', agentId)
            .selectAll()
            .execute();
        
        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as IAgentEducation[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getAgentGovIds = async (agentId: number): QueryResult<{IdType: string, IdNumber: string | null}[]> => {
    try {
        const result = await db.selectFrom('Tbl_Agents')
            .where('AgentID', '=', agentId)
            .selectAll()
            .executeTakeFirst();

        if(!result){
            throw new Error('No agent found.')
        }

        console.log(result)

        const columns = [
            'PRCNumber',
            'DSHUDNumber',
            'SSSNumber',
            'PhilhealthNumber',
            'PagIbigNumber',
            'TINNumber',
            'EmployeeIDNumber'
        ]

        const ids = columns.map((column: string) => {
            const value = result[column as keyof TblAgents]

            return {
                IdType: column,
                IdNumber: value?.toString() || null
            }
        })
        
        return {
            success: true,
            data: ids
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as {IdType: string, IdNumber: string}[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const getBrokerGovIds = async (brokerId: number): QueryResult<{IdType: string, IdNumber: string | null}[]> => {
    try {
        const result = await db.selectFrom('Tbl_Broker')
            .where('BrokerID', '=', brokerId)
            .selectAll()
            .executeTakeFirst();

        if(!result){
            throw new Error('No agent found.')
        }

        console.log(result)

        const columns = [
            'PRCNumber',
            'DSHUDNumber',
            'SSSNumber',
            'PhilhealthNumber',
            'PagIbigNumber',
            'TINNumber',
            'EmployeeIDNumber'
        ]

        const ids = columns.map((column: string) => {
            const value = result[column as keyof TblBroker]

            return {
                IdType: column,
                IdNumber: value?.toString() || null
            }
        })
        
        return {
            success: true,
            data: ids
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as {IdType: string, IdNumber: string}[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findEmployeeUserById = async (userWebId: number): QueryResult<ITblUsersWeb> => {
    try {
        const result = await db.selectFrom('Tbl_UsersWeb')
            .where('UserWebID', '=', userWebId)
            .selectAll()
            .executeTakeFirstOrThrow();

        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblUsersWeb,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findEmployeeUserByUsername = async (username: string): QueryResult<{userId: number, username: string, branch: string, branchId: number, role: string, password: string}> => {
    try {
        const user = await db.selectFrom('Tbl_UsersWeb')
            .where('UserName', '=', username)
            .selectAll()
            .executeTakeFirstOrThrow()

        if(!user){
            throw new Error('No user found.')
        }

        return {    
            success: true,
            data: { 
                userId: user.UserWebID, 
                username: user.UserName, 
                branch: user.BranchName,
                branchId: user.BranchID,
                role: user.Role, 
                password: user.Password 
            }
        }
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as {userId: number, username: string, branch: string, branchId: number, role: string, password: string},
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findAgentUserByEmail = async (email: string): QueryResult<{agentUserId: number, email: string, isVerified: boolean, password: string}> => {
    try {
        const user = await db.selectFrom('Tbl_AgentUser')
            .where('Email', '=', email)
            .select(['AgentUserID', 'Email', 'IsVerified', 'Password'])
            .executeTakeFirstOrThrow()

        if(!user){
            throw new Error('No user found.')
        }

        return {    
            success: true,
            data: { 
                agentUserId: user.AgentUserID, 
                email: user.Email, 
                isVerified: user.IsVerified == 1 ? true : false, 
                password: user.Password 
            }
        }
    }

    catch (err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as {agentUserId: number, email: string,  isVerified: boolean, password: string},
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findBrokerUserByEmail = async (email: string): QueryResult<{brokerUserId: number, email: string, isVerified: boolean, password: string}> => {
     try {
        const user = await db.selectFrom('Tbl_BrokerUser')
            .where('Email', '=', email)
            .select(['BrokerUserID', 'Email', 'IsVerified', 'Password'])
            .executeTakeFirstOrThrow()

        if(!user){
            throw new Error('No user found.')
        }

        return {    
            success: true,
            data: { 
                brokerUserId: user.BrokerUserID, 
                email: user.Email, 
                isVerified: user.IsVerified == 1 ? true : false, 
                password: user.Password 
            }
        }
    }

    catch (err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as {brokerUserId: number, email: string,  isVerified: boolean, password: string},
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findAgentUserById = async (agentUserId: number): QueryResult<{agentUserId: number, agentRegistrationId: number | null, email: string, isVerified: boolean, password: string}> => {
    try {
        const user = await db.selectFrom('Tbl_AgentUser')
            .where('AgentUserID', '=', agentUserId)
            .select(['AgentUserID', 'Email', 'IsVerified', 'Password', 'AgentRegistrationID'])
            .executeTakeFirstOrThrow()

        if(!user){
            throw new Error('No user found.')
        }

        return {    
            success: true,
            data: { 
                agentUserId: user.AgentUserID, 
                agentRegistrationId: user.AgentRegistrationID || null,
                email: user.Email, 
                isVerified: user.IsVerified == 1 ? true : false, 
                password: user.Password 
            }
        }
    }

    catch (err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as {agentUserId: number, agentRegistrationId: number | null, email: string,  isVerified: boolean, password: string},
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findAgentDetailsByUserId = async (agentUserId: number): QueryResult<VwAgentPicture> => {
    try {

        const account = await db.selectFrom('Tbl_AgentUser')
            .where('AgentUserID', '=', agentUserId)
            .select(['AgentID', 'ImageID'])
            .executeTakeFirstOrThrow();

        const agent: VwAgents = await db.selectFrom('Vw_Agents')
            .where('AgentID', '=', account.AgentID)
            .selectAll()
            .executeTakeFirstOrThrow()
        
        const picture = await db.selectFrom('Tbl_Image')
            .where('ImageID', '=', account.ImageID)
            .selectAll()
            .executeTakeFirst();

        let obj: VwAgentPicture = {
            ...agent
        }

        if(picture){
            obj = {
                ...agent,
                Image: {
                    ContentType: picture.ContentType,
                    CreatedAt: picture.CreatedAt,
                    FileContent: `data:${picture.ContentType};base64,${bufferToBase64(picture.FileContent)}`,
                    FileExtension: picture.FileExtension,
                    Filename: picture.Filename,
                    FileSize: picture.FileSize,
                    ImageID: picture.ImageID
                }
            }
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
            data: {} as VwAgentPicture,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findAgentDetailsByAgentId = async (agentId: number): QueryResult<VwAgentPicture> => {
    try {

        const agent: VwAgents = await db.selectFrom('Vw_Agents')
            .where('AgentID', '=', agentId)
            .selectAll()
            .executeTakeFirstOrThrow()
        
        const account = await db.selectFrom('Tbl_AgentUser')
            .where('AgentID', '=', agentId)
            .select(['AgentUserID', 'ImageID', 'Email'])
            .executeTakeFirst();

        let pictureDetails: TblImageWithId | undefined = undefined

        if(account?.ImageID){
            const picture = await db.selectFrom('Tbl_Image')
                .where('ImageID', '=', account.ImageID)
                .selectAll()
                .executeTakeFirst();

            if(picture){
                pictureDetails = {
                    ...picture,
                    ImageID: picture.ImageID
                }
            }
            
        }

        let obj: VwAgentPicture = {
            Email: account?.Email || null,
            ...agent
        }

        if(pictureDetails){
            obj = {
                ...agent,
                Email: account?.Email || null,
                Image: {
                    ContentType: pictureDetails.ContentType,
                    CreatedAt: pictureDetails.CreatedAt,
                    FileContent: `data:${pictureDetails.ContentType};base64,${bufferToBase64(pictureDetails.FileContent)}`,
                    FileExtension: pictureDetails.FileExtension,
                    Filename: pictureDetails.Filename,
                    FileSize: pictureDetails.FileSize,
                    ImageID: pictureDetails.ImageID
                }
            }
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
            data: {} as VwAgentPicture,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const findBrokerDetailsByBrokerId = async (brokerId: number): QueryResult<IBroker> => {
    try {
        const result = await db.selectFrom('Tbl_Broker')
            .selectAll()
            .where('BrokerID', '=', brokerId)
            .executeTakeFirstOrThrow();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as IBroker,
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

export const findBrokerDetailsByUserId = async (brokerUserId: number): QueryResult<IBrokerEmailPicture> => {
    try {

        console.log("broker user id", brokerUserId)

        const account = await db.selectFrom('Tbl_BrokerUser')
            .where('BrokerUserID', '=', brokerUserId)
            .select(['BrokerID', 'ImageID', 'BrokerRegistrationID'])
            .executeTakeFirstOrThrow();

        const broker: ITblBroker = await db.selectFrom('Tbl_Broker')
            .where('BrokerID', '=', account.BrokerID)
            .selectAll()
            .executeTakeFirstOrThrow()
        
        const picture = await db.selectFrom('Tbl_Image')
            .where('ImageID', '=', account.ImageID)
            .selectAll()
            .executeTakeFirst();

        let obj: IBrokerEmailPicture = {
            ...broker,
            BrokerRegistrationID: account.BrokerRegistrationID,
        }

        if(picture){
            obj = {
                ...broker,
                BrokerRegistrationID: account.BrokerRegistrationID,
                Image: {
                    ContentType: picture.ContentType,
                    CreatedAt: picture.CreatedAt,
                    FileContent: `data:${picture.ContentType};base64,${bufferToBase64(picture.FileContent)}`,
                    FileExtension: picture.FileExtension,
                    Filename: picture.Filename,
                    FileSize: picture.FileSize,
                    ImageID: picture.ImageID
                }
            }
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
            data: {} as IBrokerEmailPicture,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}


export const editAgentDetails = async (agentId: number, data: IAgentEdit, currentData: VwAgentPicture): QueryResult<any> => {
    const trx = await db.startTransaction().execute();
    try {
        
        // editing logic
        const filteredData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined)
        );
        
        // Check if there's actually data to update
        if (Object.keys(filteredData).length === 0) {
            throw new Error('No valid fields to update');
        }

        const partialData = mapToEditAgent(data);
        
        const result = await trx.updateTable('Tbl_Agents')
            .where('AgentID', '=', agentId)
            .set(partialData)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        if(data.firstName || data.lastName || data.middleName){
            const fullName = `${data.lastName || currentData.LastName}, ${data.firstName || currentData.FirstName} ${data.middleName || currentData.MiddleName}`;
            console.log("full name update: ",fullName)
            const updateRows = await trx.updateTable('Tbl_SalesTransDtl')
                .where('AgentID', '=', agentId)
                .set({
                    AgentName: fullName
                })
                .execute();
        }

        await trx.commit().execute();

        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown){
        await trx.rollback().execute();
        const error = err as Error
        return {
            success: false,
            data: {} as IAgent,
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const editBrokerDetails = async (brokerId: number, data: Partial<ITblBroker>, currentData: IBrokerEmailPicture): QueryResult<any> => {
    const trx = await db.startTransaction().execute();
    try {

        console.log(data)

        if(data.RepresentativeName || data.Broker){
            data.RepresentativeName = data.RepresentativeName || data.Broker;
            data.Broker = data.Broker || data.RepresentativeName;
        }

        const updateData = {
            ...data,
            LastUpdate: new Date()
        }

        const result = await trx.updateTable('Tbl_Broker')
            .where('BrokerID', '=', brokerId)
            .set(updateData)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        if(data.RepresentativeName || data.Broker){
            const update = await trx.updateTable('Tbl_SalesTransDtl')
                .where('AgentName', '=', currentData.RepresentativeName)
                .where('PositionName', 'like', '%broker%')
                .set({
                    AgentName: data.Broker || data.RepresentativeName || undefined,
                })
                .execute();
        }

        await trx.commit().execute();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        await trx.rollback().execute();
        const error = err as Error
        return {
            success: false,
            data: {} as ITblBroker,
            error: {
                code: 400,
                message: error.message
            }
        }
    }
}

export const editAgentImage = async (imageId: number, imageData: IImage): QueryResult<IImageBase64> => {
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

export const addAgentImage = async (agentId: number, imageData: IImage): QueryResult<IImageBase64> => {

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

        const updateAgent = trx.updateTable('Tbl_AgentUser')
            .where('AgentID', '=', agentId)
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

export const editAgentEducation = async (agentId: number, editedEducation: IAgentEducationEdit[], createdEducation: IAgentEducation[], deletedEducation: number[]): QueryResult<any> => {
    
    console.log(editedEducation, createdEducation)
    const trx = await db.startTransaction().execute();
    
    try {

        const editedEducs = []
        const addedEducs = []
        const deletedEducs = []

        if(editedEducation.length > 0){
            for(const edu of editedEducation){

                const mapped = mapToEditEducation(edu);

                console.log(mapped)
                console.log('AgentID: ', agentId, 'AgentEducationID: ', edu.AgentEducationID)

                const result = await trx.updateTable('Tbl_AgentEducation')
                    .where('AgentID', '=', agentId)
                    .where('AgentEducationID', '=', edu.AgentEducationID)
                    .set(mapped)
                    .outputAll('inserted')
                    .executeTakeFirstOrThrow();

                console.log('edit result: ',result)

                if(result) editedEducs.push(result)
            }
        }

        if(createdEducation.length > 0){
            const insertValues = createdEducation.map(edu => ({
                AgentID: agentId,
                AgentRegistrationID: edu.AgentRegistrationID,
                Degree: edu.Degree,
                EndDate: edu.EndDate,
                School: edu.School,
                StartDate: edu.StartDate
            }));

            console.log(insertValues)

            const result = await trx.insertInto('Tbl_AgentEducation')
                .values(insertValues)
                .outputAll('inserted')
                .execute();

            console.log('create result:', result)

            if(result) addedEducs.push(...result)
        }

        if(deletedEducation.length > 0){
            const result = await trx.deleteFrom('Tbl_AgentEducation')
                .where('AgentEducationID', 'in', deletedEducation)
                .outputAll('deleted')
                .execute();

            console.log('delete result:', result)

            if(result) deletedEducs.push(...result)
        }

        trx.commit().execute()

        return {
            success: true,
            data: {
                edited: editedEducs,
                added: addedEducs,
                deleted: deletedEducs
            }
        }

    }

    catch (err: unknown){
        trx.rollback().execute();
        const error = err as Error
        return {
            success: false,
            data: [] as IAgentEducation[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const editBrokerEducation = async (brokerId: number, editedEducation: Partial<ITblBrokerEducation>[], createdEducation: ITblBrokerEducation[], deletedEducation: number[]): QueryResult<any> => {
    
    console.log(editedEducation, createdEducation)
    const trx = await db.startTransaction().execute();
    
    try {

        const editedEducs = []
        const addedEducs = []
        const deletedEducs = []

        if(editedEducation.length > 0){
            for(const edu of editedEducation){

                // const mapped = mapToEditEducation(edu);

                // console.log(mapped)
                // console.log('AgentID: ', agentId, 'AgentEducationID: ', edu.AgentEducationID)

                edu.BrokerID = undefined
                edu.BrokerRegistrationID = undefined

                const mapped: Partial<ITblBrokerEducation> = {
                    School: edu.School,
                    Degree: edu.Degree,
                    StartDate: edu.StartDate,
                    EndDate: edu.EndDate
                }

                console.log("1", mapped.School)
                console.log("2", mapped.StartDate)
                console.log("3", mapped.EndDate)
                console.log(4, brokerId)
                console.log(5, edu.BrokerEducationID)

                const result = await trx.updateTable('Tbl_BrokerEducation')
                    .where('BrokerID', '=', brokerId)
                    .where('BrokerEducationID', '=', edu.BrokerEducationID!)
                    .set(mapped)
                    .outputAll('inserted')
                    .executeTakeFirstOrThrow();

                console.log('edit result: ',result)

                if(result) editedEducs.push(result)
            }
        }

        if(createdEducation.length > 0){
            const insertValues = createdEducation.map(edu => ({
                BrokerID: brokerId,
                BrokerRegistrationID: edu.BrokerRegistrationID,
                Degree: edu.Degree,
                EndDate: edu.EndDate,
                School: edu.School,
                StartDate: edu.StartDate
            }));

            console.log(insertValues)

            const result = await trx.insertInto('Tbl_BrokerEducation')
                .values(insertValues)
                .outputAll('inserted')
                .execute();

            console.log('create result:', result)

            if(result) addedEducs.push(...result)
        }

        if(deletedEducation.length > 0){
            const result = await trx.deleteFrom('Tbl_BrokerEducation')
                .where('BrokerEducationID', 'in', deletedEducation)
                .outputAll('deleted')
                .execute();

            console.log('delete result:', result)

            if(result) deletedEducs.push(...result)
        }

        trx.commit().execute()

        return {
            success: true,
            data: {
                edited: editedEducs,
                added: addedEducs,
                deleted: deletedEducs
            }
        }

    }

    catch (err: unknown){
        trx.rollback().execute();
        const error = err as Error
        return {
            success: false,
            data: [] as IAgentEducation[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const editAgentWorkExp = async (agentId: number, editedWorkExp: IAgentWorkExpEdit[], createdWorkExp: IAgentWorkExp[], deletedWorkExp: number[]): QueryResult<any> => {
    
    const trx = await db.startTransaction().execute();
    
    try {

        const editedWorks = []
        const addedWorks = []
        const deletedWorks = []

        if(editedWorkExp.length > 0){
            for(const work of editedWorkExp){

                const mapped = mapToEditWorkExp(work);

                console.log(mapped)
                console.log('AgentID: ', agentId, 'AgentWorkExpID: ', work.AgentWorkExpID)

                const result = await trx.updateTable('Tbl_AgentWorkExp')
                    .where('AgentID', '=', agentId)
                    .where('AgentWorkExpID', '=', work.AgentWorkExpID)
                    .set(mapped)
                    .outputAll('inserted')
                    .executeTakeFirstOrThrow();

                console.log('edit result: ',result)

                if(result) editedWorks.push(result)
            }
        }

        if(createdWorkExp.length > 0){
            const insertValues = createdWorkExp.map(work => ({
                AgentID: agentId,
                AgentRegistrationID: work.AgentRegistrationID,
                Company: work.Company,
                EndDate: work.EndDate,
                JobTitle: work.JobTitle,
                StartDate: work.StartDate
            }));

            console.log(insertValues)

            const result = await trx.insertInto('Tbl_AgentWorkExp')
                .values(insertValues)
                .outputAll('inserted')
                .execute();

            console.log('create result:', result)

            if(result) addedWorks.push(...result)
        }

        if(deletedWorkExp.length > 0){
            const result = await trx.deleteFrom('Tbl_AgentWorkExp')
                .where('AgentWorkExpID', 'in', deletedWorkExp)
                .outputAll('deleted')
                .execute();
            
            if(result) deletedWorks.push(...result)
        }

        trx.commit().execute()

        return {
            success: true,
            data: {
                edited: editedWorks,
                added: addedWorks,
                deleted: deletedWorks
            }
        }

    }

    catch (err: unknown){
        trx.rollback().execute();
        const error = err as Error
        return {
            success: false,
            data: [] as IAgentWorkExp[],
            error: {
                code: 400,
                message: error.message
            },
        }
    }
}

export const editBrokerWorkExp = async (brokerId: number, editedWorkExp: Partial<ITblBrokerWorkExp>[], createdWorkExp: ITblBrokerWorkExp[], deletedWorkExp: number[]): QueryResult<any> => {
    
    const trx = await db.startTransaction().execute();
    
    try {

        const editedWorks = []
        const addedWorks = []
        const deletedWorks = []

        if(editedWorkExp.length > 0){
            for(const work of editedWorkExp){

                // const mapped = mapToEditWorkExp(work);

                // console.log(mapped)
                // console.log('AgentID: ', agentId, 'AgentWorkExpID: ', work.AgentWorkExpID)

                work.BrokerID = undefined
                work.BrokerRegistrationID = undefined

                const mapped: Partial<ITblBrokerWorkExp> = {
                    Company: work.Company,
                    JobTitle: work.JobTitle,
                    StartDate: work.StartDate,
                    EndDate: work.EndDate
                }

                const result = await trx.updateTable('Tbl_BrokerWorkExp')
                    .where('BrokerID', '=', brokerId)
                    .where('BrokerWorkExpID', '=', work.BrokerWorkExpID!)
                    .set(mapped)
                    .outputAll('inserted')
                    .executeTakeFirstOrThrow();

                console.log('edit result: ',result)

                if(result) editedWorks.push(result)
            }
        }

        if(createdWorkExp.length > 0){
            const insertValues = createdWorkExp.map(work => ({
                BrokerID: brokerId,
                BrokerRegistrationID: work.BrokerRegistrationID,
                Company: work.Company,
                EndDate: work.EndDate,
                JobTitle: work.JobTitle,
                StartDate: work.StartDate
            }));

            console.log(insertValues)

            const result = await trx.insertInto('Tbl_BrokerWorkExp')
                .values(insertValues)
                .outputAll('inserted')
                .execute();

            console.log('create result:', result)

            if(result) addedWorks.push(...result)
        }

        if(deletedWorkExp.length > 0){
            const result = await trx.deleteFrom('Tbl_BrokerWorkExp')
                .where('BrokerWorkExpID', 'in', deletedWorkExp)
                .outputAll('deleted')
                .execute();
            
            if(result) deletedWorks.push(...result)
        }

        trx.commit().execute()

        return {
            success: true,
            data: {
                edited: editedWorks,
                added: addedWorks,
                deleted: deletedWorks
            }
        }

    }

    catch (err: unknown){
        trx.rollback().execute();
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

// export const getBrokers = async (): QueryResult<ITblBroker[]> => {
//     try {
//         const result = await db.selectFrom('Tbl_Broker')
//             .selectAll()
//             .execute();
        
//         return {
//             success: true,
//             data: result
//         }
//     }

//     catch (err: unknown) {
//         const error = err as Error;
//         return {
//             success: false,
//             data: [] as ITblBroker[],
//             error: {
//                 code: 500,
//                 message: error.message
//             }
//         }
//     }
// }

export const unlinkAgentUser = async (userId: number, agentUserId: number): QueryResult<ITblAgentUser> => {

    console.log('userId: ', userId, 'agentUserId: ', agentUserId)

    try {
        const result = await db.updateTable('Tbl_AgentUser')
            .set({
                AgentID: null,
                IsVerified: 0,
            })
            .where('AgentUserID', '=', agentUserId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const unlinkBrokerUser = async (userId: number, brokerUserId: number): QueryResult<ITblBrokerUser> => {

    console.log('userId: ', userId, 'brokerUserId: ', brokerUserId)

    try {
        const result = await db.updateTable('Tbl_BrokerUser')
            .set({
                BrokerID: null,
                IsVerified: 0,
            })
            .where('BrokerUserID', '=', brokerUserId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblBrokerUser,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}