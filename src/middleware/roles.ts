import { Request, Response, NextFunction } from "express"

const roleMap = new Map<string, string>([
    ["SALES PERSON", "SP"],
    ["UNIT MANAGER", "UM"],
    ["SALES DIRECTOR", "SD"],

    ["BRANCH SALES STAFF", "BH"],
    ["SALES ADMIN", "SA"],
    ["ACCOUNTING STAFF", "AS"],
    ["MANAGEMENT LEVEL", "ML"],

    ["BROKER", "BR"]
])

export const validateRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.session?.userRole || ''

        console.log(roleMap.get(userRole), allowedRoles)

        if(!allowedRoles.includes(roleMap.get(userRole) || '')) {
            res.status(403).json({success: false, data: [], message: 'Insufficient permission.'})
            return;
        }

        next();
    }
}