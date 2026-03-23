import { string } from "zod";
import { VwAgents } from "../db/db-types";
import { addAgent, assignUMtoSPs, deleteAgent, editAgent, getAgent, getAgentByCode, getAgentEducation, getAgentImages, getAgentRegistration, getAgentRegistrations, getAgentRegistrationsNoImages, getAgents, getAgentUserByAgentId, getAgentWithRegistration, getAgentWithUser, getAgentWorkExp, unassignSPs } from "../repository/agents.repository";
import { editDivisionBroker, getDivisionBrokers, getDivisions } from "../repository/division.repository";
import { getPositions } from "../repository/position.repository";
import { getMultipleTotalPersonalSales } from "../repository/sales.repository";
import { getAgentTaxRate } from "../repository/tax.repository";
import { findAgentDetailsByAgentId, findAgentDetailsByUserId, findAgentsDetailsByAgentId, getAgentUsers } from "../repository/users.repository";
import { IAddAgent, ITblAgent, ITblAgentRegistration } from "../types/agent.types";
import { IAgentRegistration, IAgentRegistrationListItem, ITblAgentUser } from "../types/auth.types";
import { IBrokerDivision } from "../types/division.types";
import { QueryResult } from "../types/global.types";
import { ITypedImageBase64, TblImageWithId } from "../types/image.types";
import { ITblAgentTaxRates } from "../types/tax.types";
import { IAgent } from "../types/users.types";
import { hashPassword } from "../utils/scrypt";
import { getPresignedUrl } from "../utils/r2";

export const getAgentsService = async (
    filters?: {
        showInactive?: boolean, 
        showNoDivision?: boolean,
        division?: number, 
        position?: 'SP' | 'UM' | 'SD' | 'BR',
        excludePosition?: 'SP' | 'UM' | 'SD' | 'BR',
        isRegistered?: boolean,
        isVerified?: boolean,
        month?: number,
        year?: number,
        searchTerm?: string
    }, 
    pagination?: {
        page?: number,
        pageSize?: number
    },
    showRegistration: boolean = false,
    showSales: boolean = false,
    showBrokerDivisions: boolean = false,
    showHandsOffBrokers: boolean = false
): QueryResult<{totalPages: number, results: IAgent[]}> => {

    const positionMap = new Map<string, number[]>(
        [
            ['SP', [5]],
            ['UM', [86]],
            ['SD', [85]],
            ['BR', [72, 73, 76]]
        ]
    )

    console.log('filters', filters)
    console.log('showBrokerDivisions', showBrokerDivisions)
    console.log('showSales', showSales)
    // const brokerPositionIds = [72, 73, 76]

    const result = await getAgents(
        {
            ...filters,
            positionId: filters && filters.position ? positionMap.get(filters.position) : undefined,
            excludePositionId: filters && filters.excludePosition ? positionMap.get(filters.excludePosition) : undefined
        },
        pagination
    )

    if(!result.success){
        return {
            success: false,
            data: {} as {totalPages: number, results: IAgent[]},
            error: result.error
        }
    }

    // Conditionally fetch sales data only if showSales is true
    let agentSalesMap = new Map<number, number>();
    let brokerDivisionMap = new Map<number, {DivisionID: number, DivisionName: string}[]>()

    if (showSales) {
        const agentSales = await getMultipleTotalPersonalSales(
            { agentIds: result.data.results.map((b: IAgent) => b.AgentID) },
            filters
        )

        // Create lookup maps for O(1) access
        if (agentSales.success) {
            agentSalesMap = new Map(
                agentSales.data.map((s: any) => [s.AgentID, s.TotalSales || 0])
            );
        }
    }

    if(showBrokerDivisions){
        
        const brokerPositions = positionMap.get('BR') || []
        
        const validBrokers = result.data.results.filter((a: IAgent) => brokerPositions.includes(a.PositionID || 0))

        const brokerDivisions = await getDivisionBrokers({ agentIds: validBrokers.map((agent: IAgent) => agent.AgentID)})

        if(brokerDivisions.success){
            brokerDivisions.data.forEach((d: IBrokerDivision) => {
                const divisionInfo = { DivisionID: d.DivisionID, DivisionName: d.DivisionName }

                if(d.AgentID){
                    const existing = brokerDivisionMap.get(d.AgentID) || []
                    brokerDivisionMap.set(d.AgentID, [...existing, divisionInfo])
                }
            })
        }
    }

    const obj = result.data.results.map((item: (IAgent & { IsVerified: number | null })) => {
        return {
            ...item,
            IsVerified: item.IsVerified == 1 ? true : false,
            ...(showSales && { TotalSales: agentSalesMap.get(item.AgentID) || 0 } ),
            ...((showBrokerDivisions && positionMap.get('BR')?.includes(item.PositionID || 0)) && { BrokerDivisions: brokerDivisionMap.get(item.AgentID) || [] })

        }
    })

    return {
        success: true,
        data: {
            totalPages: result.data.totalPages,
            results: obj
        }
    }
}

export const getAgentRegistrationsService = async (pagination?: {page?: number, pageSize?: number}): QueryResult<{totalPages: number, result: IAgentRegistrationListItem[]}> => {

    const brokerPosition = await getPositions({ positionName: 'BROKER' })

    if(!brokerPosition.success || brokerPosition.data.length === 0){
        return {
            success: false,
            data: {} as {totalPages: number, result: IAgentRegistrationListItem[]},
            error: brokerPosition.error
        }
    }

    const result = await getAgentRegistrationsNoImages({ isVerified: 1, excPositionID: [brokerPosition.data[0].PositionID] }, pagination)

    if(!result.success){
        return {
            success: false,
            data: {} as {totalPages: number, result: IAgentRegistrationListItem[]},
            error: result.error
        }
    }

    const obj: IAgentRegistrationListItem[] = result.data.result.map((item: IAgentRegistration) => ({
        AgentRegistrationID: item.AgentRegistrationID,
        FirstName: item.FirstName,
        MiddleName: item.MiddleName || '',
        LastName: item.LastName,
        Email: item.Email,
        Gender: item.Gender,
        ContactNumber: item.ContactNumber,
        Division: item.Division
    }))

    return {
        success: true,
        data: {
            totalPages: result.data.totalPages,
            result: obj
        }
    }
}

export const lookupAgentDetailsService = async (agentId: number): QueryResult<any> => {

    const [
        agentWithUserResult,
        registrationResult,
        agentEducation,
        agentWork
    ] = await Promise.all([
        getAgentWithUser(agentId),
        getAgentRegistration({agentId: agentId}),
        getAgentEducation(agentId),
        getAgentWorkExp(agentId)
    ])

    let backupAgentData: VwAgents | undefined = undefined

    if(!agentWithUserResult.success){

        const agent = await getAgent(agentId)

        if(!agent.success){
            return {
                success: false,
                data: null,
                error: agent.error
            }
        }

        backupAgentData = agent.data
        // return {
        //     success: false,
        //     data: null,
        //     error: agentWithUserResult.error
        // }
    }

    const imageIds = []
    imageIds.push(agentWithUserResult.data.user.ImageID || null)
    imageIds.push(registrationResult.data.SelfieImageID || null)
    imageIds.push(registrationResult.data.GovImageID || null)

    // images

    const agentImages = await getAgentImages(imageIds.filter(id => id != null) as number[])
    const formattedImages = agentImages.data.map((img: TblImageWithId) => {
            return {
                ...img,
                FileContent: img.FileContent ? img.FileContent.toString('base64') : ''
            }
    })

    // divisions

    const brokerDivisions = await getDivisionBrokers({ agentIds: [agentId]})

    const brokerPosition = await getPositions({ positionName: 'BROKER' })
    const unitManagerPosition = await getPositions({ positionName: 'UNIT MANAGER' })

    let isBroker = false
    let isUM = false
    let allowedDivisions: { DivisionID: number, DivisionName: string}[] = []
    let salespersons: { AgentID: number, FirstName: string, LastName: string, MiddleName: string | undefined }[] = []

    const brokerPositionId = brokerPosition.data[0].PositionID
    const unitManagerPositionId = unitManagerPosition.data[0].PositionID

    // division head 

    let divisionHead: {FirstName: string  | null, LastName: string | null, MiddleName: string | undefined} = {} as any

    if(agentWithUserResult.data.agent.DivisionID){
        const division = await getDivisions({ divisionIds: [Number(agentWithUserResult.data.agent.DivisionID)] })
        
        if(division.success && division.data.length > 0){
            const divHeadAgent = await findAgentDetailsByAgentId(division.data[0].DirectorID || 0)
            if(divHeadAgent.success){
                divisionHead = {
                    FirstName: divHeadAgent.data.FirstName,
                    LastName: divHeadAgent.data.LastName,
                    MiddleName: divHeadAgent.data.MiddleName || undefined
                }
            }
        }
    }

    // additional fields based on position

    if(agentWithUserResult.success || backupAgentData){
        const posId = agentWithUserResult.data.agent.PositionID || backupAgentData?.PositionID  || 0
        if(posId === brokerPositionId){
            isBroker = true
            
            brokerDivisions.data.map((item: IBrokerDivision) => {
                allowedDivisions.push({
                    DivisionName: item.DivisionName,
                    DivisionID: item.DivisionID 
                })
            })        
        }

        if(posId === unitManagerPositionId){
            isUM = true
            const salespersonsResult = await getAgents({ referredById: agentId })

            if(salespersonsResult.success){
                salespersonsResult.data.results.map((sp: IAgent) => (
                    salespersons.push({
                        AgentID: sp.AgentID,
                        FirstName: sp.FirstName,
                        LastName: sp.LastName,
                        MiddleName: sp.MiddleName || undefined
                    })
                ))
            }
        }
    }

    // tax rate
    let agentTaxRate: Partial<ITblAgentTaxRates> = {}
    if(agentWithUserResult.data || backupAgentData){

        const taxRate = await getAgentTaxRate({ agentTaxRateIds: [agentWithUserResult.data.agent.AgentTaxRate || backupAgentData?.AgentTaxRate || 0] })

        if(taxRate.success && taxRate.data.length > 0){
            const item = taxRate.data[0]
            agentTaxRate = {
                AgentTaxRateID: item.AgentTaxRateID,
                AgentTaxRateCode: item.AgentTaxRateCode,
                AgentTaxRateName: item.AgentTaxRateName,
                VATRate: item.VATRate,
                WtaxRAte: item.WtaxRAte
            }
        }
    }
    
    const obj = {
        agent: agentWithUserResult.success ? agentWithUserResult.data.agent : backupAgentData,
        registrationResult: {
            ...registrationResult.data,
            experience: agentWork.data,
            education: agentEducation.data,
        },
        divisionHead,
        taxRate: agentTaxRate,
        ...isBroker && { divisions: allowedDivisions },
        ...isUM && { salespersons: salespersons },
        images: formattedImages
    }

    return {
        success: true,
        data: obj
    }
}

export const lookupAgentRegistrationService = async (userId: number, agentRegistrationId: number): QueryResult<IAgentRegistration> => {

    if(!agentRegistrationId){
        return {
            success: false,
            data: {} as IAgentRegistration,
            error: {
                code: 400,
                message: 'Agent registration id is required.'
            }
        }
    }

    if(!process.env.R2_PUBLIC_ENDPOINT){
        return {
            success: false,
            data: {} as IAgentRegistration,
            error: {
                code: 400,
                message: 'R2_PUBLIC_ENDPOINT is not defined.'
            }
        }
    }

    const result = await getAgentRegistrations({agentRegistrationId: agentRegistrationId})

    if(!result.success){
        return {
            success: false,
            data: {} as IAgentRegistration,
            error: result.error
        }
    }

    let resultCopy = result.data.result[0];

    if (resultCopy.Images && resultCopy.Images.length > 0) {

        const imageCopies = resultCopy.Images

        const imageTypes = ['profile', 'govid', 'selfie'] as const;

        const images = imageTypes.map(type =>
            imageCopies.find((img: ITypedImageBase64) => img.ImageType === type)
        );

        const urls = await Promise.all(
            images.map(img =>
                img?.StorageKey ? img?.ImageType === 'profile' ? Promise.resolve({data: `${process.env.R2_PUBLIC_ENDPOINT}/${img.StorageKey}`}) : getPresignedUrl(img.StorageKey) : Promise.resolve(undefined)
            )
        );

        resultCopy = {
            ...resultCopy,
            Images: images
                .map((img, i) =>
                    img ? { ...img, URL: urls[i]?.data ?? null } : null
                )
                .filter((img): img is ITypedImageBase64 & { URL: string | null } => img !== null)
        };
    }

    return {
        success: true,
        data: resultCopy
    }
}

export const addAgentService = async (userId: number, data: IAddAgent, salespersonIds?: number[]) => {

    const existingAgent = await getAgentByCode(data.AgentCode)

    if(existingAgent.success){
        return {
            success: false,
            data: {},
            error: {
                code: 400,
                message: 'Agent code already exists.'
            }
        }
    }

    if(!data.PositionID){
        const position = await getPositions({positionName: 'SALES PERSON'})

        if(position.success){
            data.PositionID = position.data[0].PositionID
        }
    }

    if(data.ReferredByID){
        const referringAgent = await findAgentDetailsByAgentId(data.ReferredByID)

        if(!referringAgent.success){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Cannot find referring agent. \n' + referringAgent.error?.message
                }
            }
        }

        if(referringAgent.data.Position !== 'UNIT MANAGER'){
            return {
                success: false,
                data: {},
                error: {
                    code: 400,
                    message: 'Referring agent is not a Unit Manager.'
                }
            }
        }

        data.ReferredCode = referringAgent.data.AgentCode
    }

    if((data.Email && !data.Password) || (data.Password && !data.Email)){
        return {
            success: false,
            data: {},
            error: {
                code: 400,
                message: 'Email and password must be provided together.'
            }
        }
    }

    let pwHash = ''
    if(data.Password){
        pwHash = await hashPassword(data.Password)
    }

    const result = await addAgent(userId, data, (data.Email && data.Password) ? { email: data.Email, passwordHash: pwHash } : undefined)
    console.log(result)

    if(!result.success){
        return {
            success: false,
            data: {},
            error: result.error
        }
    }

    const umPosition = await getPositions({positionName: 'UNIT MANAGER'})
    if(salespersonIds && salespersonIds.length > 0 && (umPosition.data[0].PositionID == data.PositionID)){
        const salespersons = await getAgents({ agentIds: salespersonIds })

        const validSps = salespersons.data.results.filter((sp: IAgent) => sp.DivisionID === result.data.agent.DivisionID)

        const assign = await assignUMtoSPs(userId, result.data.agent.AgentID, result.data.agent.AgentCode, validSps.map((sp: IAgent) => sp.AgentID))

        if(!assign.success){
            return {
                success: false,
                data: {},
                error: assign.error
            }
        }
    }

    return {
        success: true,
        data: result.data
    }
}

// export const editAgentService = async (userId: number, agentId: number, data: Partial<IAddAgent>, divisions?: number[], salespersonIds?: number[]) => {

//     if(data.AgentCode){
//         data.AgentCode = undefined
//     }

//     console.log('edit data', data)

//     // verify position ID
//     const agentData = await findAgentDetailsByAgentId(agentId)
//     const positionName = agentData.data.Position?.split(' ').join('').toLowerCase()
//     console.log('psoition name: ', positionName)

//     if(data.PositionID){
        
//         if(!agentData.success){
//             return {
//                 success: false,
//                 data: {},
//                 error: agentData.error
//             }
//         }
    
//         if(!agentData.data.PositionID && !data.PositionID){
//             return {
//                 success: false,
//                 data: {},
//                 error: {
//                     code: 400,
//                     message: 'Position is required.'
//                 }
//             }
//         }

       

//         if(positionName?.includes('broker')) {
//             return {
//                 success: false,
//                 data: {},
//                 error: {
//                     code: 400,
//                     message: 'Broker agents cannot be promoted.'
//                 }
//             }
//         }

//         if(positionName == 'salesperson'){
//             const umPosition = await getPositions({positionName: 'UNIT MANAGER'})

//             console.log(umPosition)

//             if(umPosition.success){
//                 // check if position id is for unit manager
//                 if(data.PositionID != umPosition.data[0].PositionID){
//                     return {
//                         success: false,
//                         data: {},
//                         error: {
//                             code: 400,
//                             message: 'Position ID does not match for Unit Manager.'
//                         }
//                     }
//                 }
//             } else {
//                 data.PositionID = undefined
//             }

            
//         }

//         else if(positionName == 'unitmanager'){
//             // check if position id is for sales director
//             const sdPosition = await getPositions({positionName: 'SALES DIRECTOR'})

//             console.log(sdPosition)

//             if(sdPosition.success){
//                 if(data.PositionID != sdPosition.data[0].PositionID){
//                     return {
//                         success: false,
//                         data: {},
//                         error: {
//                             code: 400,
//                             message: 'Position ID does not match for Sales Director.'
//                         }
//                     }
//                 }
//             }

//             else {
//                 data.PositionID = undefined
//             }
            
            
//         }

//         else {
//             return {
//                 success: false,
//                 data: {},
//                 error: {
//                     code: 400,
//                     message: "Agent's position cannot be edited."
//                 }
//             }
//         }
//     }

//     if(((salespersonIds && salespersonIds.length > 0) || (data.ReferredByID || data.ReferredCode)) && positionName?.includes('salesdirector')){
//         return {
//             success: false,
//             data: {},
//             error: {
//                 code: 400,
//                 message: 'SPs or UMs cannot be assigned to Sales Directors.'
                
//             }
//         }
//     }

//     if((data.ReferredByID || data.ReferredCode) && positionName?.includes('unitmanager')){
//         return {
//             success: false,
//             data: {},
//             error: {
//                 code: 400,
//                 message: 'UMs cannot be assigned to Unit Managers.'
//             }
//         }
//     }

//     console.log('salespersonIds', salespersonIds)
//     if(salespersonIds && salespersonIds.length > 0){
//         const spAgents = await findAgentsDetailsByAgentId(salespersonIds)

//         if(!spAgents.success){
//             return {
//                 success: false,
//                 data: {},
//                 error: spAgents.error
//             }
//         }

//         const spPosition = await getPositions({positionName: 'SALES PERSON'})
//         const umPosition = await getPositions({positionName: 'UNIT MANAGER'})

//         if(!spPosition.success){
//             // check if position id is for unit manager
//             return {
//                 success: false,
//                 data: {},
//                 error: spPosition.error
//             }
//         }

//         if(!umPosition.success){
//             // check if position id is for unit manager
//             return {
//                 success: false,
//                 data: {},
//                 error: umPosition.error
//             }
//         }

//         if(agentData.data.PositionID != umPosition.data[0].PositionID){
//             return {
//                 success: false,
//                 data: {},
//                 error: {
//                     code: 400,
//                     message: 'Target agent is not a Unit Manager.'
//                 }
//             }
//         }

//         const hasNonSp = spAgents.data.some((item: VwAgents) => item.PositionID != spPosition.data[0].PositionID)

//         if(hasNonSp){
//             return {
//                 success: false,
//                 data: {},
//                 error: {
//                     code: 400,
//                     message: 'Some selected agents are not salespersons.'
//                 }
//             }
//         }

//         if(!agentData.data.AgentCode) {
//             return {
//                 success: false,
//                 data: {},
//                 error: {
//                     code: 400,
//                     message: 'Target agent has no agent code.'
//                 }
//             }
//         }

//         const result = await assignUMtoSPs(userId, agentId, agentData.data.AgentCode, salespersonIds)

//         if(!result.success){
//             return {
//                 success: false,
//                 data: {},
//                 error: result.error
//             }
//         }
//     }

//     const result = await editAgent(userId, agentId, data, agentData.data)

//     if(!result.success){
//         return {
//             success: false,
//             data: {},
//             error: result.error
//         }
//     }

//     // edit divisions

//     console.log(positionName)
//     console.log(divisions)

//     if(positionName && positionName.includes('broker')){
//         if(divisions){
//             const editDivisions = await editDivisionBroker(userId, divisions, {agentId: agentId})

//             if(!editDivisions.success){
//                 return {
//                     success: false,
//                     data: {},
//                     error: editDivisions.error
//                 }
//             }
//         }
//     }

//     return {
//         success: true,
//         data: result.data
//     }

// }

export const editAgentService = async (
    userId: number,
    agentId: number,
    data: Partial<IAddAgent>,
    divisions?: number[],
    salespersonIds?: number[] // now represents the FULL desired state
) => {
    if (data.AgentCode) data.AgentCode = undefined;

    const agentData = await findAgentDetailsByAgentId(agentId);
    if (!agentData.success) {
        return { success: false, data: {}, error: agentData.error };
    }

    const positionName = agentData.data.Position?.split(' ').join('').toLowerCase();

    // --- Position promotion validation ---
    if (data.PositionID) {
        if (!agentData.data.PositionID && !data.PositionID) {
            return { success: false, data: {}, error: { code: 400, message: 'Position is required.' } };
        }

        if (positionName?.includes('broker')) {
            return { success: false, data: {}, error: { code: 400, message: 'Broker agents cannot be promoted.' } };
        }

        const targetPositionName = positionName === 'salesperson' ? 'UNIT MANAGER'
            : positionName === 'unitmanager' ? 'SALES DIRECTOR'
            : null;

        if (!targetPositionName) {
            return { success: false, data: {}, error: { code: 400, message: "Agent's position cannot be edited." } };
        }

        const targetPosition = await getPositions({ positionName: targetPositionName });
        if (targetPosition.success && data.PositionID !== targetPosition.data[0].PositionID) {
            return {
                success: false, data: {},
                error: { code: 400, message: `Position ID does not match for ${targetPositionName}.` }
            };
        }

        if (!targetPosition.success) data.PositionID = undefined;
    }

    // --- Salesperson assignment validation ---
    const isSalesDirector = positionName?.includes('salesdirector');
    const isUnitManager = positionName?.includes('unitmanager');
    const isSalesPerson = positionName?.includes('salesperson');

    console.log('positionName', positionName)
    console.log('isSalesDirector', isSalesDirector)
    console.log('isUnitManager', isUnitManager)
    console.log('isSalesPerson', isSalesPerson)
    console.log('condition', ((salespersonIds && salespersonIds.length > 0) || data.ReferredByID || data.ReferredCode) && isSalesPerson)

    if (((salespersonIds && salespersonIds.length > 0) || data.ReferredByID || data.ReferredCode) && isSalesDirector) {
        return { success: false, data: {}, error: { code: 400, message: 'SPs or UMs cannot be assigned to Sales Directors.' } };
    }

    if ((data.ReferredByID || data.ReferredCode) && isUnitManager) {
        return { success: false, data: {}, error: { code: 400, message: 'UMs cannot be assigned to Unit Managers.' } };
    }

    if ((salespersonIds && salespersonIds.length > 0) && isSalesPerson) {
        return { success: false, data: {}, error: { code: 400, message: 'SPs cannot be assigned to Sales Persons.' } };
    }

    // --- Parallel SP sync + agent edit ---
    const tasks: Promise<any>[] = [editAgent(userId, agentId, data, agentData.data)];

    if (salespersonIds !== undefined && isUnitManager) {
        tasks.push(syncUMSalespersons(userId, agentId, agentData.data, salespersonIds));
    }

    const [editResult, spResult] = await Promise.all(tasks);

    if (!editResult.success) return { success: false, data: {}, error: editResult.error };
    if (spResult && !spResult.success) return { success: false, data: {}, error: spResult.error };

    // --- Broker divisions ---
    if (positionName?.includes('broker') && divisions) {
        const editDivisions = await editDivisionBroker(userId, divisions, { agentId });
        if (!editDivisions.success) return { success: false, data: {}, error: editDivisions.error };
    }

    return { success: true, data: editResult.data };
};

export const syncUMSalespersons = async (
    userId: number,
    unitManagerId: number,
    agentData: VwAgents,
    desiredSpIds: number[]
): QueryResult<any> => {
    if (!agentData.AgentCode) {
        return { success: false, data: {}, error: { code: 400, message: 'Target agent has no agent code.' } };
    }

    // Fetch in parallel: desired SP validation + current SPs under this UM
    const [spAgents, spPosition, umPosition, currentSPs] = await Promise.all([
        desiredSpIds.length > 0 ? findAgentsDetailsByAgentId(desiredSpIds) : Promise.resolve({ success: true, data: [], error: null }), // skip if no desired SPs
        getPositions({ positionName: 'SALES PERSON' }),
        getPositions({ positionName: 'UNIT MANAGER' }),
        getAgents({ referredById: unitManagerId }) // fetch SPs currently assigned to this UM
    ]);

    if (!spPosition.success) return { success: false, data: {}, error: spPosition.error };
    if (!umPosition.success) return { success: false, data: {}, error: umPosition.error };

    if (agentData.PositionID !== umPosition.data[0].PositionID) {
        return { success: false, data: {}, error: { code: 400, message: 'Target agent is not a Unit Manager.' } };
    }

    if (desiredSpIds.length > 0) {
        if (!spAgents.success) return { success: false, data: {}, error: { code: 400, message: 'Some selected agents do not exist.' } };

        const hasNonSp = spAgents.data.some((item: VwAgents) => item.PositionID !== spPosition.data[0].PositionID);
        if (hasNonSp) {
            return { success: false, data: {}, error: { code: 400, message: 'Some selected agents are not salespersons.' } };
        }
    }

    // Diff: what to add vs what to unassign
    const currentIds: (number)[] = currentSPs.data.results.filter((sp: IAgent) => sp.AgentID).map((salesperson: IAgent) => salesperson.AgentID);
    const toAdd = desiredSpIds.filter(id => !currentIds.includes(id));
    const toRemove = currentIds.filter(id => !desiredSpIds.includes(id));

    const dbTasks: Promise<any>[] = [];

    if (toAdd.length > 0) {
        dbTasks.push(assignUMtoSPs(userId, unitManagerId, agentData.AgentCode, toAdd));
    }

    if (toRemove.length > 0) {
        dbTasks.push(unassignSPs(userId, toRemove)); // nulls out ReferredByID/ReferredCode
    }

    const results = await Promise.all(dbTasks);
    const failed = results.find(r => !r.success);
    if (failed) return { success: false, data: {}, error: failed.error };

    return { success: true, data: {} };
};

export const deleteAgentService = async (userId: number, agentId: number): QueryResult<ITblAgent> => {
    const result = await deleteAgent(userId, agentId)

    if(!result.success){
        return {
            success: false,
            data: {} as ITblAgent,
            error: result.error
        }
    }

    return {
        success: true,
        data: result.data
    }
}