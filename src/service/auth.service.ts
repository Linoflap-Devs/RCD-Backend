import { IAgentRegister } from "../types/auth.types";
import { QueryResult } from "../types/global.types";
import { format } from 'date-fns'
import { IImage } from "../types/image.types";
import path from "path";
import { registerAgentTransaction } from "../repository/auth.repository";

export const registerAgentService = async (data: IAgentRegister, image?: Express.Multer.File): QueryResult<any> => {
    console.log(data, image)
    const filename = `${data.lastName}-${data.firstName}_${format(new Date(), 'yyyy-mm-dd_hh:mmaa')}`.toLowerCase();

    let metadata: IImage | undefined = undefined

    if(image)(
        metadata = {
            FileName: filename,
            ContentType: image.mimetype,
            FileExt: path.extname(image.originalname),
            FileSize: image.size,
            FileContent: image.buffer
        }
    )

    const result = await registerAgentTransaction(data, metadata)

    if(!result.success) return result

    return result
}