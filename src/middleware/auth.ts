import { Request, Response, NextFunction } from "express";
import { validateEmployeeSessionToken, validateSessionToken } from "../service/auth.service";
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
        userRole: result.user.Position,
        isVerified: result.user.IsVerified
    }

    logger('Session found', {session: req.session})

    next();
}

export const validateEmployeeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?._rcd_employee_cookie;
    if (!token) {
        logger('No token found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    const result = await validateEmployeeSessionToken(token);
    if (!result.session) {
        logger('Session not found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'});
        return; 
    } 

    req.session = {
        sessionID: result.session.SessionID,
        userID: result.user.UserID,
        userRole: result.user.Role || '',
        isVerified: 1
    }

    next();
}

export type ExpressSession = {
    sessionID: number,
    userID: number | null,
    userRole: string | null,
    isVerified: number
}

declare module 'express'{
    interface Request {
        session?: ExpressSession
    }
}
