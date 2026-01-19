import { Request, Response } from "express";
import { IAgentInvite, IAgentRegister, IBrokerRegister } from "../types/auth.types";
import { approveAgentRegistrationService, approveBrokerRegistrationService, changeAgentUserPasswordAdminService, changeEmployeePasswordAdminService, changeEmployeePasswordService, changePasswordService, findEmailSendOTP, getCurrentAgentService, getInviteTokenDetailsService, inviteNewUserService, loginAgentService, loginBrokerService, loginEmployeeService, logoutAgentSessionService, logoutBrokerSessionService, logoutEmployeeSessionService, registerAgentService, registerBrokerService, registerEmployeeService, registerInviteService, rejectAgentRegistrationService, rejectBrokerRegistrationService, verifyOTPService } from "../service/auth.service";
import { getUserDetailsWebService } from "../service/users.service";

export const registerAgentController = async (req: Request, res: Response) => {

    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    console.log(JSON.stringify(req.files))
    console.log(profileImage)

    const {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        education,
        experience,
    } = req.body

    console.log("req body", req.body)

    console.log("education and experience", education, experience)

    const obj: IAgentRegister = {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        education,
        experience
    }

    const result = await registerAgentService(obj, profileImage?.profileImage[0], profileImage?.govId[0], profileImage?.selfie[0]);

    console.log(result)
    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to register agent.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent registered successfully.",
        data: result.data
    })    
};

export const registerInviteController = async (req: Request, res: Response) => {
    const {
        firstName,
        middleName,
        lastName,
        gender,
        birthdate,
        address,
        email,  
        password,
        inviteToken
    } = req.body

    console.log("req body", req.body)

    const obj: IAgentInvite = {
        firstName,
        middleName,
        lastName,
        gender,
        birthdate,
        address,
        email,
        password,
    }

    const result = await registerInviteService(inviteToken, obj);

    console.log(result)
    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to register agent.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent registered successfully.",
        data: result.data
    })    
};

export const registerBrokerController = async (req: Request, res: Response) => {

    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    console.log(JSON.stringify(req.files))
    console.log(profileImage)

    const {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        education,
        experience,
        brokerType,
    } = req.body

    if(brokerType !== 'hands-on' && brokerType !== 'hands-off'){
        res.status(400).json({
            success: false, 
            message: "Invalid broker type. Avaiable types are 'hands-on' and 'hands-off'.",
            data: {}
        })

        return
    }


    const obj: IBrokerRegister = {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        education,
        experience,
    }

    const result = await registerBrokerService(obj, brokerType as "hands-on" | "hands-off", profileImage?.profileImage[0], profileImage?.govId[0], profileImage?.selfie[0]);

    console.log(result)
    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to register broker.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Broker registered successfully.",
        data: result.data
    })    
};

export const inviteNewUserController = async (req: Request, res: Response) => {
    
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
        email
    } = req.body

    const result = await inviteNewUserService(session.userID, email)

    console.log('controller', result)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to invite new user.",
            data: {}
        })
    }

    return res.status(200).json({
        success: true, 
        message: "User invited successfully.",
        data: result.data
    })
}

export const getInviteTokenDetailsController = async (req: Request, res: Response) => {
    const {
        referralCode
    } = req.params

    const result = await getInviteTokenDetailsService(referralCode)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to get invite token details.",
            data: {}
        })

        return
    }

    res.status(200).json({
        success: true, 
        message: "Invite token details retrieved successfully.",
        data: result.data
    })

    return
}

export const addAgentController = async (req: Request, res: Response) => {

    const profileImage = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    console.log(JSON.stringify(req.files))
    console.log(profileImage)

    const {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        agentId,
        education,
        experience,
    } = req.body


    const obj: IAgentRegister = {
        firstName,
        middleName,
        lastName,
        gender,
        civilStatus,
        religion,
        birthdate,
        birthplace,
        address,
        telephoneNumber,
        contactNumber,
        sssNumber,
        philhealthNumber,
        pagibigNumber,
        tinNumber,
        prcNumber,
        dshudNumber,
        employeeIdNumber,
        email,
        password,
        education,
        experience
    }

    const result = await registerAgentService(obj, profileImage?.profileImage[0], profileImage?.govId[0], profileImage?.selfie[0], agentId);

    console.log(result)
    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to register agent.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent registered successfully.",
        data: result.data
    })    
};

export const registerEmployeeController = async (req: Request, res: Response) => {
    const {
        branchID,
        empName,
        password,
        role,
        userCode,
        userName
    } = req.body

    const result = await registerEmployeeService({
        BranchID: Number(branchID),
        EmpName: empName,
        Password: password,
        Role: role,
        UserCode: userCode,
        UserName: userName
    })

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to register employee.",
            data: {}
        })

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Employee registered successfully.",
        data: result.data
    })
}

export const loginAgentController = async (req: Request, res: Response) => {
    const {
        email, 
        password
    } = req.body

    const result = await loginAgentService(email, password);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to login agent.", 
            data: {}
        });

        return
    }

    res.cookie('_rcd_agent_cookie', result.data.token, {httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 60 * 60 * 1000})

    return res.status(200).json({
        success: true, 
        message: "Agent logged in successfully.", 
        data: result.data
    });
}

export const loginBrokerController = async (req: Request, res: Response) => {
    const {
        email, 
        password
    } = req.body

    const result = await loginBrokerService(email, password);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to login broker.", 
            data: {}
        });

        return
    }

    res.cookie('_rcd_broker_cookie', result.data.token, {httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 60 * 60 * 1000})

    return res.status(200).json({
        success: true, 
        message: "Broker logged in successfully.", 
        data: result.data
    });
}

export const loginEmployeeController = async (req: Request, res: Response) => {
    const {
        username,
        password
    } = req.body

    const result = await loginEmployeeService(username, password)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to login employee.", 
            data: {}
        });

        return
    }

    res.cookie('_rcd_employee_cookie', result.data.token, {httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 60 * 60 * 1000})

    return res.status(200).json({
        success: true, 
        message: "Employee logged in successfully.", 
        data: result.data
    });
}

export const approveAgentRegistrationController = async (req: Request, res: Response) => {

    const {
        agentRegistrationId,
        agentId
    } = req.body

    const result = await approveAgentRegistrationService(agentRegistrationId, agentId);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to approve agent registration.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent registration approved successfully.", 
        data: result.data
    });
}

export const approveBrokerRegistrationController = async (req: Request, res: Response) => {

    const {
        brokerRegistrationId,
        brokerId
    } = req.body

    const result = await approveBrokerRegistrationService(brokerRegistrationId, brokerId);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to approve broker registration.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Broker registration approved successfully.", 
        data: result.data
    });
}

export const rejectAgentRegistrationController = async (req: Request, res: Response) => {

    const {
        agentRegistrationId,
    } = req.body

    const result = await rejectAgentRegistrationService(agentRegistrationId);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to reject agent registration.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Agent registration rejected successfully.", 
        data: result.data
    });
}

export const rejectBrokerRegistrationController = async (req: Request, res: Response) => {

    const {
        brokerRegistrationId,
    } = req.body

    const result = await rejectBrokerRegistrationService(brokerRegistrationId);

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to reject broker registration.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Broker registration rejected successfully.", 
        data: result.data
    });
}

export const getCurrentAgentController = async (req: Request, res: Response) => {

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    console.log('Current agent', session)

    const result = await getCurrentAgentService(session.userID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to get current agent.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Current agent.", 
        data: result.data
    });
}

export const getCurrentEmployeeController = async (req: Request, res: Response) => {

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    console.log('Current employee', session)
    const result = await getUserDetailsWebService(session.userID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to get current employee.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Current employee.", 
        data: result.data
    });
}

export const logoutAgentSessionController = async (req: Request, res: Response) => {

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    const result = await logoutAgentSessionService(session.sessionID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to logout agent session.", 
            data: {}
        });

        return
    }

    res.clearCookie('_rcd_agent_cookie', {httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 60 * 60 * 1000})

    return res.status(200).json({
        success: true, 
        message: "Agent session logged out successfully.", 
        data: result.data
    });
}

export const logoutEmployeeSessionController = async (req: Request, res: Response) => {

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    const result = await logoutEmployeeSessionService(session.sessionID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to logout employee session.", 
            data: {}
        });

        return
    }

    res.clearCookie('_rcd_employee_cookie', {httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 60 * 60 * 1000})

    return res.status(200).json({
        success: true, 
        message: "Employee session logged out successfully.", 
        data: result.data
    });
}

export const logoutBrokerSessionController = async (req: Request, res: Response) => {

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    };

    const result = await logoutBrokerSessionService(session.sessionID)

    if(!result.success) {
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to logout broker session.", 
            data: {}
        });

        return
    }

    res.clearCookie('_rcd_broker_cookie', {httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 60 * 60 * 1000})

    return res.status(200).json({
        success: true, 
        message: "Broker session logged out successfully.", 
        data: result.data
    });
}


export const sendOTPController = async (req: Request, res: Response) => {

    const {
        email
    } = req.body

    const result = await findEmailSendOTP(email)

    return res.status(200).json({
        success: true, 
        message: "Check your email.", 
        data: result.data
    });
}

export const verifyOTPController = async (req: Request, res: Response) => {

    const {
        email,
        otp,
    } = req.body

    const result = await verifyOTPService(email, otp)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to verify otp.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "OTP verified successfully.", 
        data: result.data
    });

}

export const updateAgentPasswordController = async (req: Request, res: Response) => {

    const {
        email,
        resetToken,
        oldPassword,
        newPassword
    } = req.body

    const result = await changePasswordService(email, resetToken, oldPassword, newPassword)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to change password.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Password changed successfully.", 
        data: result.data
    });

}

export const updateForgottenPasswordController = async (req: Request, res: Response) => {
    const {
        email,
        resetToken,
        newPassword
    } = req.body

    const result = await changePasswordService(email, resetToken, '', newPassword, true)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to change password.", 
            data: {}
        });

        return
    }

    return res.status(200).json({
        success: true, 
        message: "Password changed successfully.", 
        data: result.data
    });
}

export const changeEmployeePasswordController = async (req: Request, res: Response) => {
    const {
        oldPassword,
        newPassword
    } = req.body

    const session = req.session
    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    const result = await changeEmployeePasswordService(session.userID, oldPassword, newPassword)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to change password.", 
            data: {}
        });
        return
    }

    return res.status(200).json({
        success: true, 
        message: "Password changed successfully.", 
        data: result.data
    });
}

export const changeEmployeePasswordAdminController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }
    
    const {
        userID,
        newPassword
    } = req.body

    const result = await changeEmployeePasswordAdminService(session.userID, userID, newPassword)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to change password.", 
            data: {}
        });
        return
    }

    return res.status(200).json({
        success: true, 
        message: "Password changed successfully.", 
        data: result.data
    });
}

export const changeAgentUserPasswordAdminController = async (req: Request, res: Response) => {
    const session = req.session

    if(!session) {
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }

    if(!session.userID){
        res.status(401).json({success: false, data: {}, message: 'Unauthorized'})
        return;
    }
    
    const {
        agentUserID,
        newPassword
    } = req.body

    const result = await changeAgentUserPasswordAdminService(session.userID, agentUserID, newPassword)

    if(!result.success){
        res.status(result.error?.code || 500).json({
            success: false, 
            message: result.error?.message || "Failed to change password.", 
            data: {}
        });
        return
    }

    return res.status(200).json({
        success: true, 
        message: "Password changed successfully.", 
        data: result.data
    });
}