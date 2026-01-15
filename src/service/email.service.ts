import 'dotenv/config'
import { EmailData, SMTP2GOResponse } from '../types/email.types';
import path from 'path';
import fs from 'fs'

const apiUrl = process.env.SEND2GO_API
const apiKey = process.env.SEND2GO_KEY
const senderEmail = process.env.SENDER_EMAIL

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

    console.log('sendEmail', result);

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

export const sendTemplateEmail = async ( to: string, subject: string, textBody: string, htmlBody: string): Promise<SMTP2GOResponse> => {

    const logoPath = path.join(__dirname, '../assets/image/logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');

    if(!apiKey) {
        throw new Error('SMTP2GO_API_KEY environment variable is not set');
    }

    if(!process.env.SENDER_EMAIL) {
        throw new Error('SENDER_EMAIL environment variable is not set');
    }

    const emailData: EmailData = {
        sender: process.env.SENDER_EMAIL,
        to: [to],
        subject,
        text_body: textBody,
        html_body: htmlBody,
        api_key: apiKey,
        inlines: [
            {
                filename: 'logo',
                fileblob: logoBase64,
                mimetype: 'image/png'
            }
        ]
    };

    return sendEmail(emailData);
}