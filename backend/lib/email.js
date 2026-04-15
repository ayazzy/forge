import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'hello@tryforge.studio';
const APP_URL = process.env.APP_URL || 'https://www.tryforge.studio';

const baseStyles = `
  body { margin: 0; padding: 0; background: #111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
  .card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 36px 32px; }
  h1 { margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #ffffff; }
  p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #aaaaaa; }
  .cta { display: inline-block; background: #e03535; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; margin: 8px 0 20px; }
  .footer { margin-top: 28px; font-size: 12px; color: #555555; text-align: center; }
`;

export async function sendWelcomeEmail(toEmail) {
  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: 'Welcome to Forge — here\'s how to get started',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="card">
            <h1>Welcome to Forge 🎬</h1>
            <p>You're all set up. Forge is your AI-powered production studio for YouTube — it handles research, scripting, voice casting, image prompts, and more.</p>
            <p><strong style="color:#fff;">Here's what to do first:</strong></p>
            <p>1. Head to <strong style="color:#fff;">Trend Research</strong> to find a topic your audience is already searching for.<br>
               2. Start a <strong style="color:#fff;">Pipeline</strong> — enter your topic and run through all 8 production stages.</p>
            <a href="${APP_URL}/dashboard" class="cta">Go to your dashboard →</a>
            <p style="margin-top:8px;">Questions? Reply to this email — we read everything.</p>
          </div>
          <div class="footer">Forge · hello@tryforge.studio</div>
        </div>
      </body></html>`,
    });
  } catch (e) {
    console.error('[email] Failed to send welcome email to', toEmail, e.message);
  }
}

export async function sendCancellationEmail(toEmail) {
  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: 'Your Forge subscription has ended',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="card">
            <h1>Your subscription has ended</h1>
            <p>Your Forge subscription has been cancelled and your access to the pipeline, trend research, and episode generation has ended.</p>
            <p>If this was a mistake, or if you'd like to continue making videos, you can resubscribe at any time — your previous channel settings will still be there.</p>
            <a href="${APP_URL}/pricing" class="cta">Resubscribe →</a>
            <p style="margin-top:8px;">If you have any questions or feedback, reply to this email — we'd love to hear from you.</p>
          </div>
          <div class="footer">Forge · hello@tryforge.studio</div>
        </div>
      </body></html>`,
    });
  } catch (e) {
    console.error('[email] Failed to send cancellation email to', toEmail, e.message);
  }
}

export async function sendTrialEndingEmail(toEmail, daysLeft) {
  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: 'Your Forge trial ends in 2 days',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="card">
            <h1>Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h1>
            <p>Your 7-day free trial is almost up. After it ends, you'll lose access to:</p>
            <p>
              • The 8-stage production pipeline<br>
              • AI-powered trend research &amp; topic validation<br>
              • Script generation, voice casting, and image prompts<br>
              • Your saved episodes and channel profile
            </p>
            <p>Subscribe now to keep your access — no interruptions to your workflow.</p>
            <a href="${APP_URL}/pricing" class="cta">Choose a plan →</a>
            <p style="margin-top:8px;">Plans start at $39/mo. Cancel anytime.</p>
          </div>
          <div class="footer">Forge · hello@tryforge.studio</div>
        </div>
      </body></html>`,
    });
  } catch (e) {
    console.error('[email] Failed to send trial ending email to', toEmail, e.message);
  }
}
