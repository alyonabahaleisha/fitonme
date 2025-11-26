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
