export type EmailStatus = {
    to: string,
    subject: string,
}


export interface EmailData {
    sender: string;
    to: string[];
    subject: string;
    text_body: string;
    html_body?: string;
    api_key?: string;
    cc?: string[];
    bcc?: string[];
    custom_headers?: Record<string, string>;
    inlines?: EmailInline[]
}

export interface EmailInline {
    filename: string,
    fileblob?: string,
    mimetype?: string,
    url?: string
}

export interface SMTP2GOResponse {
    data: {
        succeeded: number;
        failed: number;
        failures?: Array<{
            email: string;
            error: string;
        }>;
        error?: string;
    };
    request_id?: string;
}
