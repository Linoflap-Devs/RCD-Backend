import { TblPosition } from "../db/db-types"
import { getPositions } from "../repository/position.repository"
import { QueryResult } from "../types/global.types"

export const getPositionsService = async (): QueryResult<Partial<TblPosition>[]> => {
    const result = await getPositions({
        positionNames: [
            'SALES PERSON',
            'UNIT MANAGER',
            'SALES DIRECTOR',
            'BROKER'
        ]
    })

    if(!result.success){
        return {
            success: false,
            data: [],
            error: {
                code: 500,
                message: 'Failed to get positions. \n' + result.error?.message  
            }
        }
    }

    const obj: Partial<TblPosition>[] = result.data.map((item: TblPosition) => ({
        PositionID: item.PositionID,
        Position: item.Position.trim(),
    }))

    return {
        success: true,
        data: obj
    }
}