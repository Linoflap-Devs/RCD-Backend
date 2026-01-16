import { db } from "../db/db";
import { TblPosition } from "../db/db-types";
import { QueryResult } from "../types/global.types";

export const getPositions = async (
    filters?: {
        positionId?: number,
        showInactive?: boolean,
        positionCode?: string,
        positionName?: string,
        positionNames?: string[]
    }
): QueryResult<TblPosition[]> => {
    try {
        let baseQuery = await db.selectFrom('Tbl_Position')
            .selectAll()

        if (filters && filters.positionId) {
            baseQuery = baseQuery.where('PositionID', '=', filters.positionId)
        }

        if (filters && filters.positionCode) {
            baseQuery = baseQuery.where('PositionCode', '=', filters.positionCode)
        }

        if (filters && filters.positionName) {
            baseQuery = baseQuery.where('Position', '=', filters.positionName)
        }

        if (filters && filters.positionNames && filters.positionNames.length > 0) {
            baseQuery = baseQuery.where('Position', 'in', filters.positionNames)
        }

        if (!filters || !filters.showInactive) {
            baseQuery = baseQuery.where('IsActive', '=', 1)
        }

        const result = await baseQuery.execute()

        if (!result) {
            return {
                success: false,
                data: [] as TblPosition[],
                error: {
                    code: 404,
                    message: 'Position not found.'
                }
            }
        }

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as TblPosition[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}