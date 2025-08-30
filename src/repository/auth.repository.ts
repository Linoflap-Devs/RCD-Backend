import { QueryResult } from "../types/global.types";
import { TblAgentSession } from "../db/db-types";
import { db } from "../db/db";
import { IAgentSession, IAgentUserSession } from "../types/auth.types";

export const insertSession =  async (sessionString: string, agentUserId: number): QueryResult<IAgentSession> => {
    try {
        const result = await db.insertInto('Tbl_AgentSession').values({
            SessionString: sessionString,
            AgentUserID: agentUserId,
            ExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }).execute();

        if(!result[0].insertId) return {
            success: false,
            data: {} as IAgentSession,
            error: {
                message: 'Failed to insert session.',
                code: 500
            }
        }

        const find = await db.selectFrom('Tbl_AgentSession').where('SessionID', '=', Number(result[0].insertId)).selectAll().executeTakeFirst();

        if(!find) return {
            success: false,
            data: {} as IAgentSession,
            error: {
                message: 'Failed to find session.',
                code: 500
            }
        }

        return {
            success: true,
            data: {
                SessionID: find.SessionID,
                SessionString: find.SessionString,
                AgentUserID: find.AgentUserID,
                ExpiresAt: find.ExpiresAt
            }
        }
    }
    catch(err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentSession,
            error: {
                message: error.message,
                code: 500
            }
        }
    }
}

export const findSession = async (sessionString: string): QueryResult<IAgentUserSession> => {
    try {

        const result = await db.
            selectFrom('Tbl_AgentSession').
            where('SessionString', '=', sessionString).
            innerJoin('Tbl_AgentUser', 'Tbl_AgentSession.AgentUserID', 'Tbl_AgentUser.AgentUserID').
            selectAll().
            executeTakeFirst();

        if(!result) return {
            success: false,
            data: {} as IAgentUserSession,
            error: {
                message: 'Failed to find session.',
                code: 500
            }
        }

        return {
            success: true,
            data: {
                AgentSession: {
                    SessionID: result.SessionID,
                    SessionString: result.SessionString,
                    AgentUserID: result.AgentUserID,
                    ExpiresAt: result.ExpiresAt
                },
                AgentUser: {
                    AgentID: result.AgentID,
                    AgentRegistrationID: result.AgentRegistrationID,
                    AgentUserID: result.AgentUserID,
                    Email: result.Email,
                    ImageID: result.ImageID
                }
            }
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {} as IAgentUserSession,
            error: {
                message: error.message,
                code: 500
            }
        }
    }
}

export const deleteSession = async (sessionId: number): QueryResult<null> => {
    try {

        const result = await db.deleteFrom('Tbl_AgentSession').where('SessionID', '=', sessionId).executeTakeFirst();

        return {
            success: true,
            data: null,
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const deleteSessionUser = async (userId: number): QueryResult<null> => {
    try {

        const result = await db.deleteFrom('Tbl_AgentSession').where('AgentUserID', '=', userId).execute();

        console.log(result)

        return {
            success: true,
            data: null,
        }
    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const extendSessionExpiry = async (sessionId: number, expiry: Date): QueryResult<null> => {
    try {

        const result = await db.updateTable('Tbl_AgentSession').set({ ExpiresAt: expiry }).where('SessionID', '=', sessionId).executeTakeFirstOrThrow();

        return {
            success: true,
            data: null,
        }

    }
    catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: null,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}