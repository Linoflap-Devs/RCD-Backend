import { Request, Response } from "express"
import { getUserDivisionSalesService } from "../service/sales.service";

export const getDivisionSalesController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { page, pageSize } = req.query

    const result = await getUserDivisionSalesService(session.userID, {page: Number(page), pageSize: Number(pageSize)})

    res.status(200).json({success: true, message: 'List of division sales', data: result})
}