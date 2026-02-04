import { QueryResult } from "../types/global.types";
import { db } from "../db/db";
import { IAgent, IAgentEducation, IAgentWorkExp, VwAgentPicture } from "../types/users.types";
import { IAgentRegister, IAgentRegistration, ITblAgentUser, IVwAgents } from "../types/auth.types";
import { IImage, IImageBase64, ITypedImageBase64, TblImageWithId } from "../types/image.types";
import { sql } from "kysely";
import { FnAgentSales, IAddAgent, ITblAgent, ITblAgentRegistration } from "../types/agent.types";
import { IAgentUser } from "../types/auth.types";
import { TblAgentUser, VwAgents, VwUniqueActiveAgents, VwUniqueAgents } from "../db/db-types";
import { it } from "zod/v4/locales/index.cjs";
import { TZDate } from "@date-fns/tz";

export const getAgents = async (
    filters?: { 
        name?: string, 
        showInactive?: boolean, 
        showNoDivision?: boolean, 
        isRegistered?: boolean,
        isVerified?: boolean,
        division?: number, 
        searchTerm?: string,
        positionId?: number[] 
    },
    pagination?: {
        page?: number,
        pageSize?: number
    }
): QueryResult<{totalPages: number, results: (IAgent & {IsVerified: number | null})[]}> => {
    
    console.log(filters, pagination)
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined; // Fallback to amount for backward compatibility
        const offset = pageSize ? (page - 1) * pageSize : 0;

        let result = await db.selectFrom('Vw_UniqueAgents')
            .selectAll()

        let totalCount = await db.selectFrom('Vw_UniqueAgents')
            .select(({ fn }) => [fn.countAll<number>().as("count")])

        if(filters && filters.division){
            result = result.where('DivisionID' , '=', filters.division.toString())
            totalCount = totalCount.where('DivisionID' , '=', filters.division.toString())
        }

        if(filters && filters.name){
            result = result.where('AgentName', '=', `${filters.name}`)
            totalCount = totalCount.where('AgentName', '=', `${filters.name}`)
        }

        if(!filters || !filters.showInactive){
            result = result.where('IsActive', '=', 1)
            totalCount = totalCount.where('IsActive', '=', 1)
        }

        if(!filters || !filters.showNoDivision){
            result = result.where('DivisionID', 'is not', null)
            totalCount = totalCount.where('DivisionID', 'is not', null)
        }

        if(filters && filters.isRegistered !== undefined){
            if(filters.isRegistered === true){
                result = result.where('AgentUserID', 'is not', null)
                totalCount = totalCount.where('AgentUserID', 'is not', null)
            }
            else if(filters.isRegistered === false){
                result = result.where('AgentUserID', 'is', null)
                totalCount = totalCount.where('AgentUserID', 'is', null)
            }
        }

        if(filters && filters.isVerified !== undefined){
            if(filters.isVerified === true){
                result = result.where('IsVerified', '=', 1)
                totalCount = totalCount.where('IsVerified', '=', 1)
            }
            else if(filters.isVerified === false){
                result = result.where('IsVerified', '=', 0)
                totalCount = totalCount.where('IsVerified', '=', 0)
            }
        }

        if(filters && filters.positionId){
            result = result.where('PositionID', 'in', filters.positionId)
            totalCount = totalCount.where('PositionID', 'in', filters.positionId)
        }
        else {
            result = result.where('Position', 'in', ['SALES PERSON', 'UNIT MANAGER', 'SALES DIRECTOR', 'BROKERS', '-BROKER-', 'BROKER'])
            totalCount = totalCount.where('Position', 'in', ['SALES PERSON', 'UNIT MANAGER', 'SALES DIRECTOR', 'BROKERS', '-BROKER-', 'BROKER'])
        }

        if(filters && filters.searchTerm){
            const searchTerm = `%${filters.searchTerm}%`;
            console.log(    )
            const searchAsNumber = Number(filters.searchTerm);
            const isValidNumber = !isNaN(searchAsNumber) && filters.searchTerm.trim() !== '';
            
            result = result.where(({ or, eb }) => 
                or([
                    // String columns - always search these
                    eb('FirstName', 'like', searchTerm),
                    eb('MiddleName', 'like', searchTerm),
                    eb('LastName', 'like', searchTerm),
                    eb('AgentCode', 'like', searchTerm),
                    // Numeric column - only search if valid number
                    //...(isValidNumber ? [eb('DeveloperID', '=', searchAsNumber)] : [])
                ])
            );
            
            totalCount = totalCount.where(({ or, eb }) => 
                or([
                    // String columns - always search these
                    eb('FirstName', 'like', searchTerm),
                    eb('MiddleName', 'like', searchTerm),
                    eb('LastName', 'like', searchTerm),
                    eb('AgentCode', 'like', searchTerm),
                    // Numeric column - only search if valid number
                    //...(isValidNumber ? [eb('DeveloperID', '=', searchAsNumber)] : [])
                ])
            );
        }

        if(pagination && pagination.page && pagination.pageSize){
            result = result.offset(offset).fetch(pagination.pageSize)
        }

        result = result.orderBy('AgentID', 'desc')

        const queryResult = await result.execute();
        const countResult = await totalCount.execute();

        if(!queryResult){
            throw new Error('No agents found.');
        }

        const totalCountResult = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCountResult / pageSize) : 1;
        

        const obj: (IAgent & {IsVerified: number | null})[] = queryResult.map((item: VwUniqueAgents) => {
            return {
                ...item,
                FullName: ( `${item.LastName.trim()}, ${item.FirstName.trim()} ${item.MiddleName.trim()}` ).trim(),
                Position: item.Position?.trim()
            }
        })

        return {
            success: true,
            data: {
                totalPages: totalPages,
                results: obj,
            }
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: {} as { totalPages: number, results: (IAgent & {IsVerified: number | null})[] },
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentBrokers = async (filters?: { name?: string, showInactive?: boolean, division?: number }): QueryResult<any> => {
    try {
        let result = await db.selectFrom('Vw_Agents')
            .leftJoin('Tbl_AgentUser', 'Vw_Agents.AgentID', 'Tbl_AgentUser.AgentID')
            .leftJoin('Tbl_AgentRegistration', 'Tbl_AgentUser.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
            .selectAll('Vw_Agents')
            .select('Tbl_AgentRegistration.AgentRegistrationID')
            .select('Tbl_AgentUser.Email')

        if(filters && filters.division){
            result = result.where('DivisionID' , '=', filters.division.toString())
        }

        if(filters && filters.name){
            result = result.where('AgentName', '=', `${filters.name}`)
        }

        if(!filters || !filters.showInactive){
            result = result.where('IsActive', '=', 1)
        }

        // if(filters && filters.positionId){
        //     result = result.where('PositionID', 'in', filters.positionId)
        // }
        // else {
        // }

        result = result.where('Position', 'in', ['BROKERS', '-BROKER-', 'BROKER'])
        
        const queryResult = await result.execute();

        if(!queryResult){
            throw new Error('No agents found.');
        }

        // const obj: VwAgents[] = queryResult.map((item: VwAgents) => {
        //     return {
        //         ...item,
        //         FullName: ( `${item.LastName?.trim()}, ${item.FirstName?.trim()} ${item.MiddleName?.trim()}` ).trim(),
        //         Position: item.Position?.trim()
        //     }
        // })

        return {
            success: true,
            data: queryResult
        }
    }

    catch (err: unknown){
        const error = err as Error;
        return {
            success: false,
            data: [] as IAgent[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

// ORIGINAL

// export const getAgentRegistrations = async (): QueryResult<IAgentRegistration[]> => {
//     try {
//         const result = await db.selectFrom('Tbl_AgentRegistration')
//             .innerJoin('Tbl_AgentEducation', 'Tbl_AgentEducation.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
//             .innerJoin('Tbl_AgentWorkExp', 'Tbl_AgentWorkExp.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
//             .innerJoin('Tbl_AgentUser', 'Tbl_AgentUser.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
//             .innerJoin('Tbl_Image', 'Tbl_AgentUser.ImageID', 'Tbl_Image.ImageID')
//             .selectAll()
//             .execute();

//         const agentIdMap = new Map<number, number>()

//         result.forEach((item: any) => {
//             if(!agentIdMap.has(item.AgentRegistrationID)){
//                 agentIdMap.set(item.AgentRegistrationID, item.AgentRegistrationID)
//             }
//         })

//         const obj: IAgentRegistration[] = []
//         console.log(agentIdMap, agentIdMap.values())

//         for(const id of agentIdMap.values()){
//             console.log(id)
//             const filtered = result.filter((item: any) => item.AgentRegistrationID == id)
//             if(filtered.length <= 0) continue

//             // format image

//             let imgObj: IImageBase64 | null = null
//             if(filtered){
//                 console.log(filtered)
//                 imgObj = {
//                     FileName: filtered[0].Filename || '',
//                     ContentType: filtered[0].ContentType || '',
//                     FileExt: filtered[0].FileExtension || '',
//                     FileSize: filtered[0].FileSize || 0,
//                     FileContent: filtered[0].FileContent.toString('base64') || ''
//                 }
//             }

//             // format education array

//             const education: IAgentEducation[] = []
//             const educIds: number[] = []

//             filtered.forEach((item: any) => {
//                 if(!educIds.includes(item.AgentEducationID)){
//                     educIds.push(item.AgentEducationID)
//                     education.push({
//                         AgentEducationID: item.AgentEducationID,
//                         AgentID: item.AgentID,
//                         AgentRegistrationID: item.AgentRegistrationID,
//                         Degree: item.Degree,
//                         EndDate: item.EndDate,
//                         School: item.School,
//                         StartDate: item.StartDate
//                     })
//                 }
//             })

//             const workExp: IAgentWorkExp[] = []
//             const workExpId: number[] = []

//             filtered.forEach((item: any) => {
//                 if(!workExpId.includes(item.AgentWorkExpID)){
//                     workExpId.push(item.AgentWorkExpID)
//                     workExp.push({
//                         AgentWorkExpID: item.AgentWorkExpID,
//                         AgentID: item.AgentID,
//                         AgentRegistrationID: item.AgentRegistrationID,
//                         Company: item.Company,
//                         EndDate: item.EndDate,
//                         JobTitle: item.JobTitle,
//                         StartDate: item.StartDate
//                     })
//                 }
//             })

//             const agent: IAgentRegistration = {
//                 FirstName: filtered[0].FirstName,
//                 MiddleName: filtered[0].MiddleName,
//                 LastName: filtered[0].LastName,
//                 Email: filtered[0].Email,
//                 Password: filtered[0].Password,
//                 Gender: filtered[0].Sex as ('Male' | 'Female'),
//                 CivilStatus: filtered[0].CivilStatus as ('Single' | 'Married'),
//                 Religion: filtered[0].Religion || '', 
//                 Birthdate: filtered[0].Birthdate,
//                 Birthplace: filtered[0].Birthplace || '',
//                 Address: filtered[0].Address,
//                 TelephoneNumber: filtered[0].TelephoneNumber || '',
//                 ContactNumber: filtered[0].ContactNumber,
//                 SssNumber: filtered[0].SSSNumber || '',
//                 PhilhealthNumber: filtered[0].PhilhealthNumber,
//                 PagibigNumber: filtered[0].PagIbigNumber,
//                 TinNumber: filtered[0].TINNumber,
//                 PrcNumber: filtered[0].PRCNumber,
//                 DshudNumber: filtered[0].DSHUDNumber,
//                 EmployeeIdNumber: filtered[0].EmployeeIDNumber,
//                 ProfileImage: imgObj || null,
//                 Experience: workExp,
//                 Education: education,
//             } 

//             obj.push(agent)
//         }   

//         return {
//             success: true,
//             data: obj
//         }
//     }

//     catch (err: unknown){
//         const error = err as Error;
//         return {
//             success: false,
//             data: [] as IAgentRegistration[],
//             error: {
//                 code: 500,
//                 message: error.message
//             }
//         }
//     }
// }

export const getAgentRegistrations = async (
    filters?: {
        agentRegistrationId?: number, 
        positionID?: number, 
        isVerified?: number
    },
    pagination?: {
        page?: number,
        pageSize?: number
    }
): QueryResult<{totalPages: number, result: IAgentRegistration[]}> => {
    try {

        const page = pagination?.page ?? 1;
        const pageSize = pagination?.pageSize ?? undefined;
        const offset = pageSize ? (page - 1) * pageSize : 0;

        // 1. Get base agent registration data with user info and all three images
        let baseAgentDataQuery = await db.selectFrom('Tbl_AgentRegistration')
            .innerJoin('Tbl_AgentUser', 'Tbl_AgentUser.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
            // Join for profile image
            .leftJoin('Tbl_Image as ProfileImage', 'Tbl_AgentUser.ImageID', 'ProfileImage.ImageID')
            // Join for government ID image
            .leftJoin('Tbl_Image as GovImage', 'Tbl_AgentRegistration.GovImageID', 'GovImage.ImageID')
            // Join for selfie image
            .leftJoin('Tbl_Image as SelfieImage', 'Tbl_AgentRegistration.SelfieImageID', 'SelfieImage.ImageID')
            // Join for division info
            .leftJoin('Tbl_Agents', 'Tbl_AgentRegistration.ReferredByID', 'Tbl_Agents.AgentID')
            .leftJoin('Tbl_Division', 'Tbl_Agents.DivisionID', 'Tbl_Division.DivisionID')
            .select([
                'Tbl_AgentRegistration.AgentRegistrationID',
                'Tbl_AgentRegistration.IsVerified',
                'Tbl_AgentRegistration.FirstName',
                'Tbl_AgentRegistration.MiddleName', 
                'Tbl_AgentRegistration.LastName',
                'Tbl_AgentRegistration.Address',
                'Tbl_AgentRegistration.Birthdate',
                'Tbl_AgentRegistration.Birthplace',
                'Tbl_AgentRegistration.CivilStatus',
                'Tbl_AgentRegistration.ContactNumber',
                'Tbl_AgentRegistration.Sex',
                'Tbl_AgentRegistration.Religion',
                'Tbl_AgentRegistration.TelephoneNumber',
                'Tbl_AgentRegistration.SSSNumber',
                'Tbl_AgentRegistration.PhilhealthNumber',
                'Tbl_AgentRegistration.PagIbigNumber',
                'Tbl_AgentRegistration.TINNumber',
                'Tbl_AgentRegistration.PRCNumber',
                'Tbl_AgentRegistration.DSHUDNumber',
                'Tbl_AgentRegistration.EmployeeIDNumber',
                'Tbl_AgentUser.Email',
                'Tbl_AgentUser.Password',
                'Tbl_AgentUser.AgentID',
                // Profile image fields
                'ProfileImage.Filename as ProfileFilename',
                'ProfileImage.ContentType as ProfileContentType',
                'ProfileImage.FileExtension as ProfileFileExtension',
                'ProfileImage.FileSize as ProfileFileSize',
                'ProfileImage.FileContent as ProfileFileContent',
                // Government ID image fields
                'GovImage.Filename as GovFilename',
                'GovImage.ContentType as GovContentType',
                'GovImage.FileExtension as GovFileExtension',
                'GovImage.FileSize as GovFileSize',
                'GovImage.FileContent as GovFileContent',
                // Selfie image fields
                'SelfieImage.Filename as SelfieFilename',
                'SelfieImage.ContentType as SelfieContentType',
                'SelfieImage.FileExtension as SelfieFileExtension',
                'SelfieImage.FileSize as SelfieFileSize',
                'SelfieImage.FileContent as SelfieFileContent',
                // Division
                'Tbl_Division.Division'
            ])

        let totalCountResult = await db.selectFrom('Tbl_AgentRegistration')
            .innerJoin('Tbl_AgentUser', 'Tbl_AgentUser.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
            // Join for profile image
            .leftJoin('Tbl_Image as ProfileImage', 'Tbl_AgentUser.ImageID', 'ProfileImage.ImageID')
            // Join for government ID image
            .leftJoin('Tbl_Image as GovImage', 'Tbl_AgentRegistration.GovImageID', 'GovImage.ImageID')
            // Join for selfie image
            .leftJoin('Tbl_Image as SelfieImage', 'Tbl_AgentRegistration.SelfieImageID', 'SelfieImage.ImageID')
            .select(({ fn }) => [fn.countAll<number>().as("count")])

        console.log(filters)

        if(filters && filters.agentRegistrationId){
             baseAgentDataQuery = baseAgentDataQuery.where('Tbl_AgentRegistration.AgentRegistrationID', '=', filters.agentRegistrationId);
             totalCountResult = totalCountResult.where('Tbl_AgentRegistration.AgentRegistrationID', '=', filters.agentRegistrationId);
        }

        if(filters && filters.positionID){
            baseAgentDataQuery = baseAgentDataQuery.where('Tbl_AgentRegistration.PositionID', '=', filters.positionID);
            totalCountResult = totalCountResult.where('Tbl_AgentRegistration.PositionID', '=', filters.positionID);
        }

        if(filters && filters.isVerified){
            baseAgentDataQuery = baseAgentDataQuery.where('Tbl_AgentRegistration.IsVerified', '=', filters.isVerified)
            totalCountResult = totalCountResult.where('Tbl_AgentRegistration.IsVerified', '=', filters.isVerified)
        }

        if(pagination && pagination.page && pagination.pageSize){
            baseAgentDataQuery = baseAgentDataQuery.offset(offset).fetch(pagination.pageSize)
        }

        const baseAgentData = await baseAgentDataQuery
            .orderBy('Tbl_AgentRegistration.AgentRegistrationID', 'asc')
            .execute();
        
        const countResult = await totalCountResult.execute();

        if (baseAgentData.length === 0) {
            return {
                success: true,
                data: {totalPages: 0, result: []},
            };
        }

        

        const agentRegistrationIds = baseAgentData.map(agent => agent.AgentRegistrationID);

        // 2. Get education data for all agents in one query
        const educationData = await db.selectFrom('Tbl_AgentEducation')
            .select([
                'AgentEducationID',
                'AgentID',
                'AgentRegistrationID',
                'Degree',
                'EndDate',
                'School',
                'StartDate'
            ])
            .where('AgentRegistrationID', 'in', agentRegistrationIds)
            .execute();

        // 3. Get work experience data for all agents in one query
        const workExpData = await db.selectFrom('Tbl_AgentWorkExp')
            .select([
                'AgentWorkExpID',
                'AgentID', 
                'AgentRegistrationID',
                'Company',
                'EndDate',
                'JobTitle',
                'StartDate'
            ])
            .where('AgentRegistrationID', 'in', agentRegistrationIds)
            .execute();

        // 4. Create lookup maps for efficient data retrieval
        const educationByAgentId = educationData.reduce((acc, edu) => {
            if (!acc[edu.AgentRegistrationID!]) {
                acc[edu.AgentRegistrationID!] = [];
            }
            acc[edu.AgentRegistrationID!].push({
                AgentEducationID: edu.AgentEducationID,
                Degree: edu.Degree,
                EndDate: edu.EndDate,
                School: edu.School,
                StartDate: edu.StartDate
            });
            return acc;
        }, {} as Record<number, IAgentEducation[]>);

        const workExpByAgentId = workExpData.reduce((acc, work) => {
            if (!acc[work.AgentRegistrationID!]) {
                acc[work.AgentRegistrationID!] = [];
            }
            acc[work.AgentRegistrationID!].push({
                AgentWorkExpID: work.AgentWorkExpID,
                Company: work.Company,
                EndDate: work.EndDate || null,
                JobTitle: work.JobTitle,
                StartDate: work.StartDate
            });
            return acc;
        }, {} as Record<number, IAgentWorkExp[]>);

        // 5. Build the final result array
        const result: IAgentRegistration[] = baseAgentData.map(agent => {
            // Build images array
            const images: ITypedImageBase64[] = [];

            // Add profile image
            if (agent.ProfileFileContent) {
                images.push({
                    FileName: agent.ProfileFilename || '',
                    ContentType: agent.ProfileContentType || '',
                    FileExt: agent.ProfileFileExtension || '',
                    FileSize: agent.ProfileFileSize || 0,
                    FileContent: agent.ProfileFileContent.toString('base64'),
                    ImageType: 'profile'
                });
            }

            // Add government ID image
            if (agent.GovFileContent) {
                images.push({
                    FileName: agent.GovFilename || '',
                    ContentType: agent.GovContentType || '',
                    FileExt: agent.GovFileExtension || '',
                    FileSize: agent.GovFileSize || 0,
                    FileContent: agent.GovFileContent.toString('base64'),
                    ImageType: 'govid'
                });
            }

            // Add selfie image
            if (agent.SelfieFileContent) {
                images.push({
                    FileName: agent.SelfieFilename || '',
                    ContentType: agent.SelfieContentType || '',
                    FileExt: agent.SelfieFileExtension || '',
                    FileSize: agent.SelfieFileSize || 0,
                    FileContent: agent.SelfieFileContent.toString('base64'),
                    ImageType: 'selfie'
                });
            }

            return {
                AgentRegistrationID: agent.AgentRegistrationID,
                IsVerified: agent.IsVerified,
                FirstName: agent.FirstName,
                MiddleName: agent.MiddleName,
                LastName: agent.LastName,
                Email: agent.Email,
                Division: agent.Division,
                Gender: agent.Sex as ('Male' | 'Female'),
                CivilStatus: agent.CivilStatus as ('Single' | 'Married'),
                Religion: agent.Religion || '',
                Birthdate: agent.Birthdate,
                Birthplace: agent.Birthplace || '',
                Address: agent.Address,
                TelephoneNumber: agent.TelephoneNumber || '',
                ContactNumber: agent.ContactNumber,
                SssNumber: agent.SSSNumber || '',
                PhilhealthNumber: agent.PhilhealthNumber,
                PagibigNumber: agent.PagIbigNumber,
                TinNumber: agent.TINNumber,
                PrcNumber: agent.PRCNumber,
                DshudNumber: agent.DSHUDNumber,
                EmployeeIdNumber: agent.EmployeeIDNumber,
                Images: images,
                Experience: workExpByAgentId[agent.AgentRegistrationID] || [],
                Education: educationByAgentId[agent.AgentRegistrationID] || [],
            };
        });

        const totalCount = countResult ? Number(countResult[0].count) : 0;
        const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;
    
        return {
            success: true,
            data: {
                totalPages: totalPages,
                result: result
            }
        };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: {totalPages: 0, result: []} as { totalPages: number; result: IAgentRegistration[] },
            error: {
                code: 500,
                message: error.message
            }
        };
    }
};

type SortOption = {
    field: 'AgentName' | 'CurrentMonth'
    direction: 'asc' | 'desc'
}

export const getUnitManagerSalesTotalsFn = async (sorts?: SortOption[], take?: number, date?: Date): QueryResult<FnAgentSales[]> => {
    try {
        const orderParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        
        const result = await sql`
            SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``} *
            FROM Fn_UnitManagerSales(${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
            ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
        `.execute(db)
        
        const rows: FnAgentSales[] = result.rows as FnAgentSales[]
        return {
            success: true,
            data: rows
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as FnAgentSales[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getSalesPersonSalesTotalsFn = async (sorts?: SortOption[], take?: number, date?: Date): QueryResult<FnAgentSales[]> => {
    try {
        const orderParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        
        const result = await sql`
            SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``} *
            FROM Fn_SalesPersonSalesV2(${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
            ${orderParts.length > 0 ? sql`ORDER BY ${sql.join(orderParts, sql`, `)}` : sql``}
        `.execute(db)
        
        const rows: FnAgentSales[] = result.rows as FnAgentSales[]
        return {
            success: true,
            data: rows
        }
    } catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: [] as FnAgentSales[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentWithRegistration = async (agentId: number): QueryResult<IAgent & ITblAgentRegistration & ITblAgentUser> => {
    try {
        const agentResult = await db.selectFrom('Tbl_Agents')
            .innerJoin('Tbl_AgentUser'  , 'Tbl_Agents.AgentID', 'Tbl_AgentUser.AgentID')
            .innerJoin('Tbl_AgentRegistration', 'Tbl_AgentUser.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
            .selectAll()
            .where('Tbl_Agents.AgentID', '=', agentId)
            .executeTakeFirstOrThrow();

        if (!agentResult) {
            return {
                success: false,
                data: {} as (IAgent & ITblAgentRegistration & ITblAgentUser),
                error: {
                    code: 404,
                    message: 'Agent not found'
                }
            }
        }
        
        return {
            success: true,
            data: agentResult as (IAgent & ITblAgentRegistration & ITblAgentUser)
        }
            
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as (IAgent & ITblAgentRegistration & ITblAgentUser),
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentWithUser = async (agentId: number): QueryResult<{ agent: IVwAgents, user: ITblAgentUser }> => {
    try {
        const result = await db.selectFrom('Vw_Agents')
            .innerJoin('Tbl_AgentUser', 'Vw_Agents.AgentID', 'Tbl_AgentUser.AgentID')
            .innerJoin('Tbl_Agents', 'Vw_Agents.AgentID', 'Tbl_Agents.AgentID')
            .selectAll('Vw_Agents')
            .select([
                'Tbl_Agents.Religion',
                'Tbl_Agents.SSSNumber',
                'Tbl_Agents.TINNumber',
                'Tbl_Agents.PagIbigNumber',
                'Tbl_Agents.PhilhealthNumber',
                'Tbl_Agents.Birthplace',
                'Tbl_Agents.AffiliationDate',
                'Tbl_Agents.TelephoneNumber',
                'Tbl_AgentUser.AgentUserID',
                'Tbl_AgentUser.AgentID',
                'Tbl_AgentUser.AgentRegistrationID',
                'Tbl_AgentUser.ImageID',
                'Tbl_AgentUser.Email',
                'Tbl_AgentUser.IsVerified'
            ])
            .where('Vw_Agents.AgentID', '=', agentId)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: {
                agent: result, // contains both tables due to selectAll
                user: result   // typescript will need proper typing here
            }
        }
    }
    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: { agent: {} as VwAgents, user: {} as ITblAgentUser },
            error: {
                code: error.message.includes('no result') ? 404 : 500,
                message: error.message
            }
        }
    }
}


export const getAgent = async (agentId: number): QueryResult<IVwAgents> => {
    try {
        const result = await db.selectFrom('Vw_Agents')
            .innerJoin('Tbl_Agents', 'Vw_Agents.AgentID', 'Tbl_Agents.AgentID')
            .selectAll('Vw_Agents')
            .select([
                'Tbl_Agents.Religion',
                'Tbl_Agents.SSSNumber',
                'Tbl_Agents.TINNumber',
                'Tbl_Agents.PagIbigNumber',
                'Tbl_Agents.PhilhealthNumber',
                'Tbl_Agents.Birthplace',
                'Tbl_Agents.AffiliationDate',
                'Tbl_Agents.TelephoneNumber',
            ])
            .where('Vw_Agents.AgentID', '=', agentId)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as VwAgents,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentByCode = async (code: string): QueryResult<VwAgents> => {
    try {
        const result = await db.selectFrom('Vw_Agents')
            .selectAll()
            .where('AgentCode', '=', code)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as VwAgents,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentRegistration = async (filters?: {agentId?: number, agentRegistrationId?: number}): QueryResult<ITblAgentRegistration> => {
    try {
        let registrationQuery = await db.selectFrom('Tbl_AgentRegistration')
            .innerJoin('Tbl_AgentUser', 'Tbl_AgentRegistration.AgentRegistrationID', 'Tbl_AgentUser.AgentRegistrationID')
            .selectAll('Tbl_AgentRegistration')

        if(filters?.agentId){
            registrationQuery = registrationQuery.where('Tbl_AgentUser.AgentID', '=', filters.agentId)
        }

        if(filters?.agentRegistrationId){
            registrationQuery = registrationQuery.where('Tbl_AgentRegistration.AgentRegistrationID', '=', filters.agentRegistrationId)
        }

        const registration = await registrationQuery.executeTakeFirst()

        if(!registration){
            return {
                success: false,
                data: {} as ITblAgentRegistration,
                error: {
                    message: 'No agent registration found.',
                    code: 404
                }
            }
        }

        return {
            success: true,
            data: registration
        }
        
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentRegistrationWithoutUser = async (filters?: {agentRegistrationId?: number}): QueryResult<ITblAgentRegistration> => {
    try {
        let registrationQuery = await db.selectFrom('Tbl_AgentRegistration')
            .selectAll('Tbl_AgentRegistration')

        if(filters?.agentRegistrationId){
            registrationQuery = registrationQuery.where('Tbl_AgentRegistration.AgentRegistrationID', '=', filters.agentRegistrationId)
        }

        const registration = await registrationQuery.executeTakeFirst()

        if(!registration){
            return {
                success: false,
                data: {} as ITblAgentRegistration,
                error: {
                    message: 'No agent registration found.',
                    code: 404
                }
            }
        }

        return {
            success: true,
            data: registration
        }
        
    }

    catch(err: unknown) {
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const editAgentRegistration = async ( user: { agentId?: number, userId?: number }, agentRegistrationId: number, data: Partial<ITblAgentRegistration>): QueryResult<ITblAgentRegistration> => {
    try {

        if(!user.agentId && !user.userId){
            throw new Error('Invalid user information.')
        }

        const updateData: Partial<ITblAgentRegistration> = {
            LastUpdate: new TZDate(new Date(), 'Asia/Manila'),
            UpdateBy: user.userId || user.agentId,
            ...data,
        }

        const result = await db.updateTable('Tbl_AgentRegistration')
            .set(updateData)
            .where('AgentRegistrationID', '=', agentRegistrationId)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgentRegistration,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
    
}

export const getAgentUserByAgentId = async (agentId: number): QueryResult<ITblAgentUser> => {
    try {
        const result = await db.selectFrom('Tbl_AgentUser')
            .selectAll()
            .where('AgentID', '=', agentId)
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }

    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgentUser,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentWorkExp = async (agentId: number): QueryResult<IAgentWorkExp[]> => {
    try {
        const result = await db.selectFrom('Tbl_AgentWorkExp')
            .selectAll()
            .where('AgentID', '=', agentId)
            .execute();

        return {
            success: true,
            data: result
        }
    }
    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as IAgentWorkExp[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentEducation = async (agentId: number): QueryResult<IAgentEducation[]> => {
    try {
        const result = await db.selectFrom('Tbl_AgentEducation')
            .selectAll()
            .where('AgentID', '=', agentId)
            .execute();

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as IAgentEducation[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const getAgentImages = async (ids: number[]): QueryResult<TblImageWithId[]> => {
    try {
        const result = await db.selectFrom('Tbl_Image')
            .selectAll()
            .where('Tbl_Image.ImageID', 'in', ids)
            .execute()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: [] as TblImageWithId[],
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const addAgent = async (userId: number, agent: IAddAgent): QueryResult<ITblAgent> => {
    try {
        const result = await db.insertInto('Tbl_Agents')
            .values({
                AgentCode: agent.AgentCode,
                FirstName: agent.FirstName,
                MiddleName: agent.MiddleName,
                LastName: agent.LastName,
                Birthdate: agent.Birthdate,
                Birthplace: agent.Birthplace || '',
                CivilStatus: agent.CivilStatus,
                Religion: agent.Religion || '',
                Sex: agent.Sex,
                Address: agent.Address,
                ContactNumber: agent.ContactNumber,
                PositionID: agent.PositionID || 5,
                ContactEmergency: agent.ContactEmergency || '',
                PersonEmergency: agent.PersonEmergency || '',
                AddressEmergency: agent.AddressEmergency || '',
                EmployeeIDNumber: agent.EmployeeIDNumber || '',
                PRCNumber: agent.PRCNumber || '',
                PagIbigNumber: agent.PagIbigNumber || '',
                PhilhealthNumber: agent.PhilhealthNumber || '',
                DSHUDNumber: agent.DSHUDNumber || ' ',
                AgentTaxRate: agent.AgentTaxRate ,
                AffiliationDate: agent.AffiliationDate || new Date(),
                DivisionID: agent.DivisionID || null,
                ReferredByID: agent.ReferredByID,
                ReferredCode: agent.ReferredCode,
                TelephoneNumber: agent.TelephoneNumber,
                TINNumber: agent.TINNumber || '',
                SSSNumber: agent.SSSNumber || '',
                UpdateBy: userId,
                LastUpdate: new Date(),
                IsActive: 1
            })  
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgent,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const editAgent = async (userId: number, agentId: number, data: Partial<IAddAgent>, currentData: VwAgentPicture): QueryResult<ITblAgent> => {
    const trx = await db.startTransaction().execute()

    console.log(userId, agentId, data)
    try {
        const updateData = {
            ...data,
            LastUpdate: new Date(),
            UpdateBy: userId
        }

        const result = await db.updateTable('Tbl_Agents')
            .where('AgentID', '=', agentId)
            .set(updateData)
            .outputAll('inserted')
            .executeTakeFirstOrThrow()

        if(data.FirstName || data.LastName || data.MiddleName){
            const fullName = `${data.LastName || currentData.LastName}, ${data.FirstName || currentData.FirstName} ${data.MiddleName || currentData.MiddleName}`;
            console.log("full name update: ",fullName)
            const updateRows = await trx.updateTable('Tbl_SalesTransDtl')
                .where('AgentID', '=', agentId)
                .set({
                    AgentName: fullName
                })
                .execute();
        }

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgent,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}

export const deleteAgent = async (userId: number, agentId: number): QueryResult<ITblAgent> => {
    try {
        const result = await db.updateTable('Tbl_Agents')
            .where('AgentID', '=', agentId)
            .set({
                IsActive: 0,
                UpdateBy: userId,
                LastUpdate: new Date()
            })
            .outputAll('inserted')
            .executeTakeFirst()

        if(!result){
            throw new Error('Failed to delete agent.');
        }

        return {
            success: true,
            data: result
        }
    }

    catch(err: unknown){
        const error = err as Error
        return {
            success: false,
            data: {} as ITblAgent,
            error: {
                code: 500,
                message: error.message
            }
        }
    }
}