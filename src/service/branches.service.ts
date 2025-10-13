import { TblSalesBranch } from "../db/db-types";
import { getSalesBranches } from "../repository/branches.repository";
import { QueryResult } from "../types/global.types";

export const getSalesBranchesService = async (): QueryResult<{branchCode: string, branchID: number, branchName: string}[]> => {
    const result = await getSalesBranches()

    if(!result.success) {
        return {
            success: false,
            data: [] as {branchCode: string, branchID: number, branchName: string}[],
            error: result.error
        }
    }

    const formatted: {branchCode: string, branchID: number, branchName: string}[] = result.data.map((branch: TblSalesBranch) => {
        return {
            branchCode: branch.BranchCode.trim(),
            branchID: branch.BranchID,
            branchName: branch.BranchName.trim(),
        }
    })

    return {
        success: true,
        data: formatted
    }; 
}