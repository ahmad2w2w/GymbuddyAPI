import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'GymBuddy <noreply@gymbuddy.app>';

export async function sendVerificationEmail(email: string, name: string, verificationCode: string): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '🏋️ Verifieer je GymBuddy account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; margin: 0; font-size: 32px;">💪 GymBuddy</h1>
            </div>
            
            <h2 style="color: #1f2937; margin-bottom: 20px; text-align: center;">
              Hey ${name}! 👋
            </h2>
            
            <p style="color: #4b5563; line-height: 1.6; text-align: center;">
              Welkom bij GymBuddy! Verifieer je email adres om je account te activeren en te beginnen met het vinden van trainingsmaatjes.
            </p>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
              <p style="color: white; margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Je verificatie code:</p>
              <div style="background: white; border-radius: 8px; padding: 15px 20px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${verificationCode}</span>
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Deze code is 24 uur geldig.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Heb je dit account niet aangemaakt? Negeer deze email dan gewoon.
            </p>
            
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[EMAIL] Failed to send verification email:', error);
      return false;
    }

    console.log('[EMAIL] Verification email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetCode: string): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '🔐 Reset je GymBuddy wachtwoord',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; margin: 0; font-size: 32px;">💪 GymBuddy</h1>
            </div>
            
            <h2 style="color: #1f2937; margin-bottom: 20px; text-align: center;">
              Wachtwoord resetten
            </h2>
            
            <p style="color: #4b5563; line-height: 1.6; text-align: center;">
              Hey ${name}, je hebt een wachtwoord reset aangevraagd voor je GymBuddy account.
            </p>
            
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
              <p style="color: white; margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Je reset code:</p>
              <div style="background: white; border-radius: 8px; padding: 15px 20px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f59e0b;">${resetCode}</span>
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Deze code is 15 minuten geldig.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Heb je deze reset niet aangevraagd? Negeer deze email en je wachtwoord blijft ongewijzigd.
            </p>
            
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[EMAIL] Failed to send password reset email:', error);
      return false;
    }

    console.log('[EMAIL] Password reset email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending password reset email:', error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
