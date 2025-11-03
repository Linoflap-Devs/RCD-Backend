import { db } from "../db/db";
import { TblAgents, TblAgentWorkExp, TblBroker, TblImage, TblUsers, TblUsersWeb, VwAgents } from "../db/db-types";
import { ITblUsersWeb } from "../types/auth.types";
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


export const editAgentDetails = async (agentId: number, data: IAgentEdit): QueryResult<any> => {
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
        
        const result = await db.updateTable('Tbl_Agents')
            .where('AgentID', '=', agentId)
            .set(partialData)
            .outputAll('inserted')
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
            data: {} as IAgent,
            error: {
                code: 400,
                message: error.message
            },
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

export const getBrokers = async (): QueryResult<TblBroker[]> => {
    try {
        const result = await db.selectFrom('Tbl_Broker')
            .selectAll()
            .execute();
        
        return {
            success: true,
            data: result
        }
    }

    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: [] as TblBroker[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}