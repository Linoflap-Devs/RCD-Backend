export interface IAgentSession {
    AgentUserID: number
    ExpiresAt: Date
    SessionID: number
    SessionString: string
}

export interface IAgentUser {
    AgentID: number | null
    AgentRegistrationID: number | null
    AgentUserID: number
    Email: string
    ImageID: number | null,
    IsVerified: number
}

export interface IAgentUserSession {
    AgentSession: IAgentSession
    AgentUser: IAgentUser
}

export interface IAgentRegister {
    firstName: string,
    middleName?: string | null,
    lastName: string,
    gender: 'Male' | 'Female',
    civilStatus: 'Single' | 'Married',
    religion: string,
    birthdate: Date,
    birthplace: string,
    address: string,
    telephoneNumber: string,
    contactNumber: string,
    sssNumber?: string | null,
    philhealthNumber?: string | null,
    pagibigNumber?: string | null,
    tinNumber?: string | null,
    prcNumber?: string | null,
    dshudNumber?: string | null,
    employeeIdNumber?: string | null,
    email: string,
    password: string,

    profileImage?: Express.Multer.File,

    education: {
        school: string,
        degree: string,
        startDate: Date,
        endDate?: Date | null
    }[],
    experience: {
        jobTitle: string,
        company: string,
        startDate: Date,
        endDate?: Date | null
    }[]
}