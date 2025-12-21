import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

/**
 * Send "Outfit Ready" email to user
 * @param {string} userEmail 
 * @param {string} outfitName 
 * @param {string} imageUrl 
 */
export const sendOutfitReadyEmail = async (userEmail, outfitName, imageUrl) => {
    if (!resend) {
        console.log('[EMAIL] Resend API key not found. Skipping email notification.');
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'FitOnMe <noreply@fitonme.ai>', // Update this with your verified domain
            to: [userEmail],
            subject: `Your ${outfitName} look is ready! ✨`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ff6b5a;">Your new look is ready!</h1>
          <p>Hi there,</p>
          <p>Great news! We've finished generating your virtual try-on for <strong>${outfitName}</strong>.</p>
          
          <div style="margin: 20px 0;">
            <img src="${imageUrl}" alt="${outfitName}" style="width: 100%; max-width: 400px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
          </div>

          <p>
            <a href="${process.env.FRONTEND_URL || 'https://fitonme.ai'}/try-on" style="background-color: #ff6b5a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: bold; display: inline-block;">
              View in Closet
            </a>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            © ${new Date().getFullYear()} FitOnMe AI. All rights reserved.
          </p>
        </div>
      `,
        });

        if (error) {
            console.error('[EMAIL] Error sending email:', error);
            return false;
        }

        console.log('[EMAIL] Outfit ready email sent to:', userEmail);
        return true;
    } catch (error) {
        console.error('[EMAIL] Exception sending email:', error);
        return false;
    }
};

/**
 * Send "Saved Look" email to user with embedded image
 * @param {string} userEmail
 * @param {string} imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param {string} outfitName
 * @param {string} outfitDescription
 */
export const sendSavedLookEmail = async (userEmail, imageBase64, outfitName, outfitDescription) => {
    if (!resend) {
        console.log('[EMAIL] Resend API key not found. Skipping email.');
        return { success: false, error: 'Email service not configured' };
    }

    try {
        // Extract base64 data if it's a data URL
        let base64Data = imageBase64;
        let mimeType = 'image/png';

        if (imageBase64.startsWith('data:')) {
            const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        // Create image attachment
        const attachment = {
            filename: `${outfitName || 'your-look'}.${mimeType.split('/')[1] || 'png'}`,
            content: base64Data,
        };

        const { data, error } = await resend.emails.send({
            from: 'FitOnMe <noreply@fitonme.ai>',
            to: [userEmail],
            subject: `Your saved look from FitOnMe`,
            attachments: [attachment],
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2d2d2d; font-size: 24px; font-weight: 600; margin-bottom: 8px;">Your look is saved</h1>
          <p style="color: #666; margin-bottom: 24px;">Here's the look you loved. We've attached it so you can keep it forever.</p>

          ${outfitName ? `<p style="color: #2d2d2d; font-size: 16px; margin-bottom: 4px;"><strong>${outfitName}</strong></p>` : ''}
          ${outfitDescription ? `<p style="color: #888; font-size: 14px; margin-bottom: 24px;">${outfitDescription}</p>` : ''}

          <p style="margin-top: 32px;">
            <a href="${process.env.FRONTEND_URL || 'https://fitonme.ai'}/try-on" style="background-color: #e8645a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 28px; font-weight: 600; display: inline-block;">
              Try more looks
            </a>
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 48px; border-top: 1px solid #eee; padding-top: 16px;">
            You're receiving this because you saved a look on FitOnMe.<br/>
            © ${new Date().getFullYear()} FitOnMe AI
          </p>
        </div>
      `,
        });

        if (error) {
            console.error('[EMAIL] Error sending saved look email:', error);
            return { success: false, error: error.message };
        }

        console.log('[EMAIL] Saved look email sent to:', userEmail);
        return { success: true };
    } catch (error) {
        console.error('[EMAIL] Exception sending saved look email:', error);
        return { success: false, error: error.message };
    }
};
