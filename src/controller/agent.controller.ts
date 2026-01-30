import { Request, Response } from "express"
import { get } from "http"
import { addAgentService, deleteAgentService, editAgentService, getAgentRegistrationsService, getAgentsService, lookupAgentDetailsService, lookupAgentRegistrationService } from "../service/agents.service"

export const getAgentsController = async (req: Request, res: Response) => {

    const { 
        showInactive,
        showNoDivision,
        showBrokerDivisions,
        division,
        position,
        showSales,
        month,
        year,
        page,
        pageSize
    } = req.query

    const validPositions = ['SP', 'UM', 'SD', 'BR'] as const;
    const upperPosition = position?.toString().toUpperCase();
    
    if(position && !validPositions.includes(upperPosition as any)) {
        return res.status(400).json({
            success: false, 
            message: 'Invalid position query.', 
            data: {}
        })
    }

    console.log('params', showInactive, division, position)

    console.log(req.query)

    const result = await getAgentsService(
        {
            showInactive: showInactive === 'true', 
            showNoDivision: showNoDivision ? true : false,
            division: Number(division), 
            position: position ? position.toString().toUpperCase() as ('SP' | 'UM' | 'SD' | 'BR') : undefined,
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined
        }, 
        {
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined
        },
        showSales ? true : false,
        showBrokerDivisions ? true : false
    );

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agents.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agents.', data: result.data})

}

export const getAgentRegistrationsController = async (req: Request, res: Response) => {

    const result = await getAgentRegistrationsService();

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent registrations.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent registrations.', data: result.data})
}

export const getAgentDetailsController = async (req: Request, res: Response) => {
    const { agentId } = req.params;

    const result = await lookupAgentDetailsService(Number(agentId));

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent details.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent details.', data: result.data})
}

export const getAgentRegistrationController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { agentRegistrationId } = req.params

    const result = await lookupAgentRegistrationService(Number(session.userID), Number(agentRegistrationId));

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get agent details.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent registraton details.', data: result.data})
}

export const addNewAgentController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const {
        agentCode,
        lastName,
        firstName,
        middleName,
        contactNumber,
        divisionID,
        agentTaxRate,
        civilStatus,
        sex,
        address,
        birthdate,
        positionID,
        referredByID,
        prcNumber,
        dshudNumber,
        referredCode,
        personEmergency,
        contactEmergency,
        addressEmergency,
        affliationDate,
        religion,
        birthplace,
        telephoneNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        employeeIdNumber
    } = req.body

    const result = await addAgentService(session.userID,
        {
            AgentCode: agentCode,
            LastName: lastName,
            FirstName: firstName,
            MiddleName: middleName,
            ContactNumber: contactNumber,
            DivisionID: divisionID || null,
            AgentTaxRate: agentTaxRate,
            CivilStatus: civilStatus,
            Sex: sex,
            Address: address,
            Birthdate: birthdate,
            PositionID: positionID || undefined,
            ReferredByID: referredByID,
            PRCNumber: prcNumber,
            DSHUDNumber: dshudNumber,
            ReferredCode: referredCode,
            PersonEmergency: personEmergency,
            ContactEmergency: contactEmergency,
            AddressEmergency: addressEmergency,
            AffiliationDate: affliationDate,
            Religion: religion,
            Birthplace: birthplace,
            TelephoneNumber: telephoneNumber,
            SSSNumber: sssNumber,
            PhilhealthNumber: philhealthNumber,
            PagIbigNumber: pagibigNumber,
            TINNumber: tinNumber,
            EmployeeIDNumber: employeeIdNumber
        }
    )

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add agent.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Agent added.', data: result.data})
}


export const editAgentController = async (req: Request, res: Response) =>{
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const {
        agentId
    } = req.params

    const {
        agentCode,
        lastName,
        firstName,
        middleName,
        contactNumber,
        divisionID,
        agentTaxRate,
        civilStatus,
        sex,
        address,
        birthdate,
        positionID,
        referredByID,
        prcNumber,
        dshudNumber,
        referredCode,
        personEmergency,
        contactEmergency,
        addressEmergency,
        affliationDate,
        religion,
        birthplace,
        telephoneNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        employeeIdNumber,
        divisions
    } = req.body

    console.log("divisions", divisions)

    const divisionsMap: number[] | undefined = 
    divisions !== undefined && Array.isArray(divisions)
        ? divisions
            .filter((div: any) => div !== '' && div !== null && div !== undefined)
            .map((div: any) => Number(div))
        : undefined


    const result = await editAgentService(
        session.userID,
        Number(agentId),
        {
            AgentCode: agentCode,
            LastName: lastName,
            FirstName: firstName,
            MiddleName: middleName,
            ContactNumber: contactNumber,
            DivisionID: divisionID,
            AgentTaxRate: agentTaxRate,
            CivilStatus: civilStatus,
            Sex: sex,
            Address: address,
            Birthdate: birthdate,
            PositionID: positionID,
            ReferredByID: referredByID,
            PRCNumber: prcNumber,
            DSHUDNumber: dshudNumber,
            ReferredCode: referredCode,
            PersonEmergency: personEmergency,
            ContactEmergency: contactEmergency,
            AddressEmergency: addressEmergency,
            AffiliationDate: affliationDate,
            Religion: religion,
            Birthplace: birthplace,
            TelephoneNumber: telephoneNumber,
            SSSNumber: sssNumber,
            PhilhealthNumber: philhealthNumber,
            PagIbigNumber: pagibigNumber,
            TINNumber: tinNumber,
            EmployeeIDNumber: employeeIdNumber
        },
        divisionsMap
    )

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to edit agent.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Agent edited.', data: result.data})
}   

export const promoteAgentController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { agentId } = req.params

    const { positionID } = req.body

    const result = await editAgentService(session.userID, Number(agentId), { PositionID: positionID });

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to promote agent.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Agent promoted.', data: result.data})
}

export const deleteAgentController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { agentId } = req.params

    const result = await deleteAgentService(Number(session.userID), Number(agentId));

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to delete agent.', data: {}})
        return;
    }

    res.status(200).json({success: true, message: 'Agent deleted.', data: result.data})
}