export const emailOTPTemplate = (code: string, minutes: number) => {
    const html = /*html*/`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your One-Time Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border: 1px solid #e1e1e1; border-radius: 5px; padding: 30px;">
        <img src="cid:RCDLogo" style="width: 96px; margin-bottom: 5px;" />
            
            <h1 style="font-size: 24px; color: #333333; margin-bottom: 15px;">Your one-time password</h1>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Please use the 6-digit code below to verify your identity. This code is valid for ${minutes} minutes.</p>
            
            <div style="font-size: 32px; font-weight: bold; color: #D75C3C; text-align: center; padding: 15px; margin: 30px 0; letter-spacing: 5px;">${code}</div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e1e1e1; font-size: 14px; color: #666666;">
                RCD Realty Marketing Corp.
            </div>
        </div>
    </body>
    </html>
  `

  return html
}

export const emailChangePasswordTemplate = (date: string, time: string) => {
  const html = /*html*/`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Password Has Been Changed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border: 1px solid #e1e1e1; border-radius: 5px; padding: 30px;">
            <img src="cid:RCDLogo" style="width: 64px; margin-bottom: 20px;" />
            
            <h1 style="font-size: 24px; color: #333333; margin-bottom: 15px;">Password changed</h1>
            
            <p style="font-size: 16px; margin-bottom: 20px;">The password for your account has been successfully changed. This change was made on <span style="font-weight: bold; color: #D12C2C">${date}</span> at <span style="font-weight: bold; color: #D12C2C">${time}</span>.</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">If you made this change, no further action is required.</p>
            
            <p style="font-size: 16px; margin-bottom: 20px; color: #D12C2C;">If you did not change your password, please contact our support team immediately.</p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e1e1e1; font-size: 14px; color: #666666;">
                RCD Realty Marketing Corp.
            </div>
        </div>
    </body>
    </html>
  `

  return html
}

export const emailInviteTemplate = (inviterName: string, domain: string, inviteToken: string) => {
    const html = /*html*/`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You're invited!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="border: 1px solid #e1e1e1; border-radius: 5px; padding: 30px;">
            <img src="cid:logo" style="width: 96px; margin-bottom: 5px;" />
                
                <h1 style="font-size: 24px; color: #333333; margin-bottom: 15px;">You're invited!</h1>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Hello there!</p>

                <p style="font-size: 16px; margin-bottom: 20px;"><span style="font-weight:bold; color:#D75C3C">${inviterName}</span> sent you an invitation to join our platform as a sales person!</p>

                <p style="font-size: 16px; margin-bottom: 36px;">We're excited to have you on board. Click the button below to create your account and get started. This invite expires in 24 hours.</p>
                
                <div style="margin-bottom: 36px">
                    <a href="${domain + '/register?token=' + inviteToken}" style="display: inline-block; background-color: #D75C3C; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 16px; font-weight: 600;">
                        Accept Invitation
                    </a>
                </div>


                <p style="font-size: 12px; color: #999999">Button not working? Copy-paste this link into your browser:</p>
                <p style="font-size: 12px; color: #D75C3C">${domain + '/register?token=' + inviteToken}</p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e1e1e1; font-size: 14px; color: #666666;">
                    RCD Realty Marketing Corp.
                </div>
            </div>
        </body>
        </html>
    `

    return html
}