import { QueryResult } from "../types/global.types";
import { db } from "../db/db";
import { IAgent, IAgentEducation, IAgentWorkExp } from "../types/users.types";
import { IAgentRegister, IAgentRegistration, ITblAgentUser } from "../types/auth.types";
import { IImage, IImageBase64, ITypedImageBase64, TblImageWithId } from "../types/image.types";
import { sql } from "kysely";
import { FnAgentSales, ITblAgentRegistration } from "../types/agent.types";
import { IAgentUser } from "../types/auth.types";
import { TblAgentUser, VwAgents } from "../db/db-types";

export const getAgents = async (filters?: { showInactive?: boolean, division?: number }): QueryResult<IAgent[]> => {
    try {
        let result = await db.selectFrom('Vw_UniqueActiveAgents')
            .selectAll()

        if(filters && filters.division){
            result = result.where('DivisionID' , '=', filters.division.toString())
        }

        if(!filters || !filters.showInactive){
            result = result.where('IsActive', '=', 1)
        }

        const queryResult = await result.execute();

        if(!queryResult){
            throw new Error('No agents found.');
        }

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

export const getAgentRegistrations = async (): QueryResult<IAgentRegistration[]> => {
    try {
        // 1. Get base agent registration data with user info and all three images
        const baseAgentData = await db.selectFrom('Tbl_AgentRegistration')
            .innerJoin('Tbl_AgentUser', 'Tbl_AgentUser.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
            // Join for profile image
            .leftJoin('Tbl_Image as ProfileImage', 'Tbl_AgentUser.ImageID', 'ProfileImage.ImageID')
            // Join for government ID image
            .leftJoin('Tbl_Image as GovImage', 'Tbl_AgentRegistration.GovImageID', 'GovImage.ImageID')
            // Join for selfie image
            .leftJoin('Tbl_Image as SelfieImage', 'Tbl_AgentRegistration.SelfieImageID', 'SelfieImage.ImageID')
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
                'SelfieImage.FileContent as SelfieFileContent'
            ])
            .where('Tbl_AgentRegistration.IsVerified', '=', 0)
            .orderBy('Tbl_AgentRegistration.AgentRegistrationID', 'asc')
            .execute();

        if (baseAgentData.length === 0) {
            return {
                success: true,
                data: []
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
                Education: educationByAgentId[agent.AgentRegistrationID] || []
            };
        });

        return {
            success: true,
            data: result
        };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            success: false,
            data: [] as IAgentRegistration[],
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
            FROM Fn_SalesPersonSales(${date ? sql.raw(`'${date.toISOString()}'`) : sql.raw('getdate()')})
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

export const getAgentWithUser = async (agentId: number): QueryResult<{ agent: VwAgents, user: ITblAgentUser }> => {
    try {
        const result = await db.selectFrom('Vw_Agents')
            .innerJoin('Tbl_AgentUser', 'Vw_Agents.AgentID', 'Tbl_AgentUser.AgentID')
            .selectAll('Vw_Agents')
            .select([
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


export const getAgent = async (agentId: number): QueryResult<VwAgents> => {
    try {
        const result = await db.selectFrom('Vw_Agents')
            .selectAll()
            .where('AgentID', '=', agentId)
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

export const getAgentRegistration = async (agentId: number): QueryResult<ITblAgentRegistration> => {
    try {
        const registration = await db.selectFrom('Tbl_AgentRegistration')
            .innerJoin('Tbl_AgentUser', 'Tbl_AgentRegistration.AgentRegistrationID', 'Tbl_AgentUser.AgentRegistrationID')
            .selectAll('Tbl_AgentRegistration')
            .where('Tbl_AgentUser.AgentID', '=', agentId)
            .executeTakeFirstOrThrow()

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