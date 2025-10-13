import nodemailer from 'nodemailer'
import { EmailStatus } from '../types/email.types';
import { QueryResult } from '../types/global.types';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PW
    }
})

export const sendMail = async (to: string, subject: string, text: string): QueryResult<EmailStatus> => {
    const mail = {
        from: "RCD Realty Marketing Corp.",
        to: to,
        subject: subject,
        html: text,
        attachments: [
            {
                filename: "rcd-logo.png",
                path: "src/assets/image/logo.png",
                cid: "RCDLogo"
            }
        ]
    }   
    
    const promise = new Promise((resolve, reject) => {
        transporter.sendMail(mail, async (err, info) => {
            if (err) {
                console.log(err);
                resolve({
                    success: false,
                    data: {} as EmailStatus,
                    error: {
                        type: 'EMAIL',
                        message: err.message,
                        code: 500
                    }
                })
            } else {
                console.log(info);
                resolve({
                    success: true,
                    data: {
                        to: to,
                        subject: subject
                    }
                })
            }
        });
    })

    const result = await promise

    if(result){
        return {
            success: true,
            data: {} as EmailStatus
        }
    }
    else {
        return {
            success: false,
            data: {} as EmailStatus,
            error: {
                message: 'Email not sent.',
                code: 500
            }
        }
    }

}