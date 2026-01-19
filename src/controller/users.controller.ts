import { Request, Response } from "express";
import { addBrokerService, deleteWebBrokerService, editAgentEducationService, editAgentImageService, editAgentService, editAgentWorkExpService, editBrokerEducationService, editBrokerImageService, editBrokerService, editBrokerWorkExpService, editWebBrokerService, getAgentGovIdsService, getAgentUsersService, getBrokerDetailsService, getBrokerRegistrationsService, getBrokersGovIdsService, getBrokersService, getInvitedEmailsService, getMobileAccountsService, getUserDetailsService, getUserDetailsWithValidationService, getUsersService, lookupBrokerDetailsService, lookupBrokerRegistrationService, top10SPsService, top10UMsService, unlinkAgentUserService, unlinkBrokerUserService } from "../service/users.service";
import { IAgentEdit, IAgentEducation, IAgentEducationEdit, IAgentEducationEditController } from "../types/users.types";
import { QueryResult } from "../types/global.types";
import { IEditBroker, ITblBroker } from "../types/brokers.types";
import { ITblUsersWeb } from "../types/auth.types";

export const getUsersController = async (req: Request, res: Response) => {
    const result = await getUsersService();
    
    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get users.",
            data: []
         });
        return
    }

    const obj: Partial<ITblUsersWeb>[] = result.data.map((user: ITblUsersWeb) => ({
        UserWebID: user.UserWebID,
        UserCode: user.UserCode,
        UserName: user.UserName,
        EmpName: user.EmpName,
        Role: user.Role,
        BranchName: user.BranchName,
        BranchID: user.BranchID
    }))

    return res.status(200).json({
        success: true,
        message: "List of users.",
        data: obj
    });
};

export const getAgentUsersController = async (req: Request, res: Response) => {
    const result = await getAgentUsersService()

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get agent users.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "List of agent users.",
        data: result.data
    });
}

export const getAgentUserDetailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getUserDetailsService(session.userID)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get user details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "User details.",
        data: result.data
    });
}

export const getBrokerUserDetailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getBrokerDetailsService(session.userID)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get broker details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Broker details.",
        data: result.data
    });
}

export const getOtherBrokerUserDetailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { brokerId } = req.params

    const result = await lookupBrokerDetailsService(Number(brokerId))

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get broker details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Broker details.",
        data: result.data
    })
}

export const getAgentGovIdsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getAgentGovIdsService(session.userID)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get user gov ids.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Agent government IDs.",
        data: result.data
    })
}

export const getBrokerGovIdsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getBrokersGovIdsService(session.userID)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get user gov ids.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Broker government IDs.",
        data: result.data
    })
}

export const findAgentByAgentIdController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { agentId } = req.params

    const result = await getUserDetailsWithValidationService(Number(session.userID), Number(agentId))

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get user details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: `User details for Agent ID ${agentId}.`,
        data: result.data
    })
}

export const editAgentDetailsController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const {
        firstName,
        lastName,
        middleName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber
    } = req.body

    const obj: IAgentEdit = {
        firstName,
        lastName,
        middleName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber
    }

    const result = await editAgentService(session.userID, obj)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to edit user details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "User details.",
        data: result.data
    });
}

export const editBrokerDetailsController = async (req: Request, res: Response) => {

    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const {
        name,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber
    } = req.body

    const obj: IEditBroker = {
        name: name,
        gender: gender,
        civilStatus: civilStatus,
        religion: religion,
        birthdate: birthdate,
        birthplace: birthplace,
        address: address,
        telephoneNumber: telephoneNumber,
        contactNumber: contactNumber
    }

const result = await editBrokerService(session.userID, obj)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to edit user details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "User details.",
        data: result.data
    });
}

export const editAgentImageController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    
    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    if(!profileImage){
        res.status(400).json({success: false, data: {}, message: 'Image not found'})
        return
    }

    const result = await editAgentImageService(session.userID, profileImage.profileImage[0])

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to edit user image'})
        return;
    }

    res.status(200).json({success: true, data: result.data, message: 'User image edited'})
}

export const editBrokerImageController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    
    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined

    if(!profileImage){
        res.status(400).json({success: false, data: {}, message: 'Image not found'})
        return
    }

    const result = await editBrokerImageService(session.userID, profileImage.profileImage[0])

    if(!result.success) {
        res.status(result.error?.code || 400).json({success: false, data: {}, message: result.error?.message || 'Failed to edit user image'})
        return;
    }

    res.status(200).json({success: true, data: result.data, message: 'User image edited'})
}

export const editAgentEducationController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [], remove = [] } = req.body; // Default to empty arrays

    const result = await editAgentEducationService(session.userID, edit, create, remove);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit user education'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'User education edited' });
};

export const editBrokerEducationController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [], remove = [] } = req.body; // Default to empty arrays

    const result = await editBrokerEducationService(session.userID, edit, create, remove);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit broker education'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'Broker education edited' });
};

export const editAgentWorkExpController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [], remove = [] } = req.body; // Default to empty arrays

    const result = await editAgentWorkExpService(session.userID, edit, create, remove);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit user work exp'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'User work exp edited' });
};

export const editBrokerWorkExpController = async (req: Request, res: Response) => {
    const session = req.session;

    if (!session || !session.userID) {
        return res.status(401).json({ success: false, data: {}, message: 'Unauthorized' });
    }

    const { edit = [], create = [], remove = [] } = req.body; // Default to empty arrays

    const result = await editBrokerWorkExpService(session.userID, edit, create, remove);

    if (!result.success) {
        return res.status(result.error?.code || 400).json({
            success: false,
            data: {},
            message: result.error?.message || 'Failed to edit broker work exp'
        });
    }

    return res.status(200).json({ success: true, data: result.data, message: 'Broker work exp edited' });
};

export const getBrokersController = async (req: Request, res: Response) => {

    const { showSales, month, year } = req.query

    const result = await getBrokersService(showSales ? true : false, { month: month ? Number(month) : undefined, year: year ? Number(year) : undefined })

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get brokers.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "List of brokers.",
        data: result.data
    });
}

export const getBrokerRegistrationsController = async (req: Request, res: Response) => {

    console.log("getBrokerRegistrations")

    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    const result = await getBrokerRegistrationsService()

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get broker registrations.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Broker registrations.",
        data: result.data
    })
}

export const getBrokerRegistrationDetailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return
    }

    const { brokerRegistrationId } = req.params

    const result = await lookupBrokerRegistrationService(Number(brokerRegistrationId))

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get broker registration details.",
            data: {}
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Broker registration details.",
        data: result.data
    })
}

export const getTop10UMsController = async (req: Request, res: Response) => {
    const { date } = req.query

    let query = undefined
    if(date){
        const convert = new Date(date.toString())

        if(convert){
            query = convert
        }
    }

    const result = await top10UMsService(query)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get top 10 UMs.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Top 10 UMs.",
        data: result.data
    });
}

export const getTop10SPsController = async (req: Request, res: Response) => {
    const { date } = req.query

    let query = undefined
    if(date){
        const convert = new Date(date.toString())

        if(convert){
            query = convert
        }
    }

    const result = await top10SPsService(query)

    if(!result.success){
        res.status(400).json({ 
            success: false,
            message: result.error?.message || "Failed to get top 10 SPs.",
            data: []
         });
        return
    }

    return res.status(200).json({
        success: true,
        message: "Top 10 SPs.",
        data: result.data
    });
}

export const addBrokerController = async (req: Request, res: Response) => {
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
        brokerType,
        brokerCode,
        lastName,
        firstName,
        middleName,
        contactNumber,
        brokerTaxRate,
        civilStatus,
        sex,
        address,
        birthdate,
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

    const result = await addBrokerService(session.userID,
        {
            BrokerType: brokerType,
            BrokerCode: brokerCode,
            LastName: lastName,
            FirstName: firstName,
            MiddleName: middleName,
            ContactNumber: contactNumber,
            DivisionID: null,
            BrokerTaxRate: brokerTaxRate,
            CivilStatus: civilStatus,
            Sex: sex,
            Address: address,
            Birthdate: birthdate,
            PositionID: undefined,
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
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to add broker.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Broker added.', data: result.data})
}

export const editWebBrokerController = async (req: Request, res: Response) => {
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
        brokerId
    } = req.params

     const {
        brokerCode,
        representativeName,
        brokerTaxRate,
        contactNumber,
        civilStatus,
        sex,
        address,
        birthdate,
        referredByID,
        prcNumber,
        dshudNumber,
        personEmergency,
        contactEmergency,
        addressEmergency,
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

    console.log("divisions param ", divisions)

    const divisionsMap: number[] | undefined = 
    divisions !== undefined && Array.isArray(divisions)
        ? divisions
            .filter((div: any) => div !== '' && div !== null && div !== undefined)
            .map((div: any) => Number(div))
        : undefined

    const obj: Partial<ITblBroker> = {
        BrokerCode: brokerCode,
        BrokerTaxRate: brokerTaxRate,
        RepresentativeName: representativeName,
        ContactNumber: contactNumber,
        CivilStatus: civilStatus,
        Sex: sex,
        Address: address,
        Birthdate: birthdate,
        ReferredByID: referredByID,
        PRCNumber: prcNumber,
        DSHUDNumber: dshudNumber,
        PersonEmergency: personEmergency,
        ContactEmergency: contactEmergency,
        AddressEmergency: addressEmergency,
        Religion: religion,
        Birthplace: birthplace,
        TelephoneNumber: telephoneNumber,
        SSSNumber: sssNumber,
        PhilhealthNumber: philhealthNumber,
        PagIbigNumber: pagibigNumber,
        TINNumber: tinNumber,
        EmployeeIDNumber: employeeIdNumber
    }

    const result = await editWebBrokerService(session.userID, Number(brokerId), obj, divisionsMap)

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to edit broker.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Broker edited.', data: result.data})
}

export const deleteWebBrokerController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { brokerId } = req.params

    const result = await deleteWebBrokerService(session.userID, Number(brokerId))

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to delete broker.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Broker deleted.', data: result.data})
}

export const unlinkAgentUserController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { agentUserId } = req.params

    const result = await unlinkAgentUserService(session.userID, Number(agentUserId))

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to unlink agent user.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Agent user unlinked.', data: result.data})
}

export const unlinkBrokerUserController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const { brokerUserId } = req.params

    const result = await unlinkBrokerUserService(session.userID, Number(brokerUserId))

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to unlink broker user.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Broker user unlinked.', data: result.data})
}

export const getMobileAccountsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getMobileAccountsService()

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get mobile accounts.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Mobile accounts.', data: result.data})
}

export const getUserInvitedEmailsController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await getInvitedEmailsService(session.userID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({success: false, message: result.error?.message || 'Failed to get invited emails.', data: {}})
        return;
    }

    return res.status(200).json({success: true, message: 'Invited emails.', data: result.data})
}