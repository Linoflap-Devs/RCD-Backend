import { db } from "../db/db";
import { TblUsers } from "../db/db-types";
import { QueryResult } from "../types/global.types";

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