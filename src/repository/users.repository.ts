import { db } from "../db/db";
import { TblAgents, TblAgentWorkExp, TblUsers, VwAgents } from "../db/db-types";
import { QueryResult } from "../types/global.types";
import { IAgent, IAgentEducation, IAgentPicture, IAgentWorkExp, VwAgentPicture } from "../types/users.types";
import { bufferToBase64 } from "../utils/utils";

export const getUsers = async (): QueryResult<TblUsers[]> => {
    try {
        const users = await db.selectFrom('Tbl_Users').selectAll().execute();
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

export const findAgentUserById = async (agentUserId: number): QueryResult<{agentUserId: number, email: string, isVerified: boolean, password: string}> => {
    try {
        const user = await db.selectFrom('Tbl_AgentUser')
            .where('AgentUserID', '=', agentUserId)
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