import 'dotenv/config'

const apiUrl = process.env.SEND2GO_API
const apiKey = process.env.SEND2GO_KEY

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

export async function sendEmail(emailData: EmailData): Promise<SMTP2GOResponse> {

    if (!apiKey) {
        throw new Error('SMTP2GO_API_KEY environment variable is not set');
    }

    console.log(JSON.stringify(emailData));

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Smtp2go-Api-Key': apiKey,
            'accept': 'application/json'
        },
        body: JSON.stringify(emailData)
    });

    const result: SMTP2GOResponse = await response.json();

    if (!response.ok) {
        throw new Error(`Email send failed: ${result.data?.error || response.statusText}`);
    }

    return result;
}

export async function sendSimpleEmail(
    sender: string,
    to: string | string[],
    subject: string,
    textBody: string,
    htmlBody?: string
): Promise<SMTP2GOResponse> {
    const emailData: EmailData = {
        sender,
        to: Array.isArray(to) ? to : [to],
        subject,
        text_body: textBody,
        api_key: apiKey
    };

    if (htmlBody) {
        emailData.html_body = htmlBody;
    }

    return sendEmail(emailData);
}