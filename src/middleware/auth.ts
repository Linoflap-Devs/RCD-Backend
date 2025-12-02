import { Request, Response, NextFunction } from "express";
import { validateBrokerSessionToken, validateEmployeeSessionToken, validateSessionToken } from "../service/auth.service";
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

export const validateMobileSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
     const token = req.cookies?._rcd_broker_cookie || req.cookies?._rcd_agent_cookie;

    if(req.cookies?._rcd_broker_cookie){
        logger('Using broker token', {token: req.cookies?._rcd_broker_cookie})
        if (!token) {
            logger('No token found', {token: token})
            res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
            return;
        };

        const result = await validateBrokerSessionToken(token);
        if (!result.session) {
            logger('Session not found', {token: token})
            res.status(401).json({success: false, data: {}, message: 'Unauthorized'});
            return; 
        } 

        req.session = {
            sessionID: result.session.SessionID,
            userID: result.user.BrokerUserID,
            userRole: 'HANDS-OFF BROKER',
            isVerified: 1
        }

        logger('Session found', {session: req.session})
    }

    else if (req.cookies?._rcd_agent_cookie){
        logger('Using agent token', {token: req.cookies?._rcd_agent_cookie})
        if (!token) {
            logger('No token found', {token: token})
            res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
            return;
        }

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
    }

    else {
        logger('No token found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }
   

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

export const validateBrokerSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?._rcd_broker_cookie;
    if (!token) {
        logger('No token found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    const result = await validateBrokerSessionToken(token)
    if (!result.session) {
        logger('Session not found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'});
        return
    }

    req.session = {
        sessionID: result.session.SessionID,
        userID: result.user.BrokerUserID,
        userRole: 'HANDS-OFF BROKER',
        isVerified: result.user.IsVerified
    }

    next();
}

export const validateAgentEmployeeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?._rcd_employee_cookie || req.cookies?._rcd_agent_cookie;

    if(req.cookies?._rcd_employee_cookie){
        logger('Using employee token', {token: req.cookies?._rcd_employee_cookie})
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

        logger('Session found', {session: req.session})
    }

    else if (req.cookies?._rcd_agent_cookie){
        logger('Using agent token', {token: req.cookies?._rcd_agent_cookie})
        if (!token) {
            logger('No token found', {token: token})
            res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
            return;
        }

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
    }

    else {
        logger('No token found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }
   

    next();
}

export const validateAllSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?._rcd_employee_cookie || req.cookies?._rcd_agent_cookie || req.cookies?._rcd_broker_cookie;

    if(req.cookies?._rcd_employee_cookie){
        logger('Using employee token', {token: req.cookies?._rcd_employee_cookie})
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

        logger('Session found', {session: req.session})
    }

    else if (req.cookies?._rcd_agent_cookie){
        logger('Using agent token', {token: req.cookies?._rcd_agent_cookie})
        if (!token) {
            logger('No token found', {token: token})
            res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
            return;
        }

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
    }

    else if (req.cookies?._rcd_broker_cookie){
        logger('Using broker token', {token: req.cookies?._rcd_broker_cookie})
        if (!token) {
            logger('No token found', {token: token})
            res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
            return;
        };

        const result = await validateBrokerSessionToken(token);
        if (!result.session) {
            logger('Session not found', {token: token})
            res.status(401).json({success: false, data: {}, message: 'Unauthorized'});
            return; 
        } 

        req.session = {
            sessionID: result.session.SessionID,
            userID: result.user.BrokerUserID,
            userRole: 'HANDS-OFF BROKER',
            isVerified: result.user.IsVerified
        }
    }

    else {
        logger('No token found', {token: token})
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
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
