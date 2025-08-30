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
    ImageID: number | null
}

export interface IAgentUserSession {
    AgentSession: IAgentSession
    AgentUser: IAgentUser
}