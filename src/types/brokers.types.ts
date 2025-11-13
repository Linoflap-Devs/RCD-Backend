export interface IBroker {
    Broker: string;
    BrokerCode: string;
    BrokerID: number;
    IsActive: number;
    LastUpdate: Date;
    RepresentativeName: string;
    UpdateBy: number;
}

export type IBrokerPicture = IBroker & {
    ContentType?: string;
    CreatedAt?: Date;
    FileContent?: Buffer;
    FileExtension?: string;
    Filename?: string;
    FileSize?: number;
    ImageID?: number;
}

export type IBrokerEmailPicture = IBroker & {
    Email?: string | null;
    Image?: {
        ContentType: string;
        CreatedAt: Date;
        FileContent: string;
        FileExtension: string;
        Filename: string;
        FileSize: number;
        ImageID: number;
    }
}


export interface ITblBroker {
    Broker: string;
    BrokerCode: string;
    BrokerID: number;
    IsActive: number;
    LastUpdate: Date;
    RepresentativeName: string;
    UpdateBy: number;
}