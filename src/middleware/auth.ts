import { Request, Response, NextFunction } from "express";
import { validateSessionToken } from "../service/auth.service";
import { logger } from "../utils/logger";

export const validateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?._rcd_agent_cookie;
    if (!token) {
        logger('No token found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    const result = await validateSessionToken(token);
    if (!result.session) {
        logger('Session not found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'});
        return; 
    } 

    req.session = {
        sessionID: result.session.SessionID,
        userID: result.user.AgentUserID,
        isVerified: result.user.IsVerified
    }

    next();
}

export type ExpressSession = {
    sessionID: number,
    userID: number | null,
    isVerified: number
}

declare module 'express'{
    interface Request {
        session?: ExpressSession
    }
}
