import { Request, Response, NextFunction } from "express"

const roleMap = new Map<string, string>([
    ["SP", "SALES PERSON"],
    ["UM", "UNIT MANAGER"],
    ["SD", "SALES DIRECTOR"],
])

export const validateRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.session?.userRole || ''

        console.log(userRole, allowedRoles)

        if(!allowedRoles.includes(roleMap.get(userRole) || '')) {
            res.status(403).json({success: false, data: [], message: 'Insufficient permission.'})
            return;
        }

        next();
    }
}