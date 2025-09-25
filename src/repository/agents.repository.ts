import { QueryResult } from "../types/global.types";
import { db } from "../db/db";
import { IAgent, IAgentEducation, IAgentWorkExp } from "../types/users.types";
import { IAgentRegister, IAgentRegistration } from "../types/auth.types";
import { IImage, IImageBase64 } from "../types/image.types";
import { sql } from "kysely";
import { FnAgentSales } from "../types/agent.types";

export const getAgents = async (filters?: { showInactive?: boolean, division?: number }): QueryResult<IAgent[]> => {
    try {
        let result = await db.selectFrom('Tbl_Agents')
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
        // 1. Get base agent registration data with user info and images
        const baseAgentData = await db.selectFrom('Tbl_AgentRegistration')
            .innerJoin('Tbl_AgentUser', 'Tbl_AgentUser.AgentRegistrationID', 'Tbl_AgentRegistration.AgentRegistrationID')
            .leftJoin('Tbl_Image', 'Tbl_AgentUser.ImageID', 'Tbl_Image.ImageID')
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
                'Tbl_Image.Filename',
                'Tbl_Image.ContentType',
                'Tbl_Image.FileExtension',
                'Tbl_Image.FileSize',
                'Tbl_Image.FileContent'
            ])
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
                EndDate: work.EndDate,
                JobTitle: work.JobTitle,
                StartDate: work.StartDate
            });
            return acc;
        }, {} as Record<number, IAgentWorkExp[]>);

        // 5. Build the final result array
        const result: IAgentRegistration[] = baseAgentData.map(agent => {
            // Format image if exists
            let imgObj: IImageBase64 | null = null;
            if (agent.FileContent) {
                imgObj = {
                    FileName: agent.Filename || '',
                    ContentType: agent.ContentType || '',
                    FileExt: agent.FileExtension || '',
                    FileSize: agent.FileSize || 0,
                    FileContent: agent.FileContent.toString('base64')
                };
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
                ProfileImage: imgObj,
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

export const getSalesPersonSalesTotalsFn = async (sorts?: SortOption[], take?: number): QueryResult<FnAgentSales[]> => {
    try {
        const orderParts: any[] = []
        
        if (sorts && sorts.length > 0) {
            sorts.forEach(sort => {
                orderParts.push(sql`${sql.ref(sort.field)} ${sql.raw(sort.direction.toUpperCase())}`)
                
            })
        }
        
        const result = await sql`
            SELECT ${take ? sql`TOP ${sql.raw(take.toString())}` : sql``} *
            FROM Fn_SalesPersonSales(getdate())
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