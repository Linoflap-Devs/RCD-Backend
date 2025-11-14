import { getSectors } from "../repository/sectors.repository";
import { QueryResult } from "../types/global.types";
import { ITblSalesSector } from "../types/sectors.types";

export const getSectorsService = async (): QueryResult<Partial<ITblSalesSector>[]> => {
    const result = await getSectors()

    if(!result.success){
        return {
            success: false,
            data: [],
            error: result.error
        }
    }

    const obj = result.data.map((item: ITblSalesSector) => ({
        SectorID: item.SectorID,
        SectorName: item.SectorName,
        SectorCode: item.SectorCode
    }))

    return {
        success: true,
        data: obj
    }
}