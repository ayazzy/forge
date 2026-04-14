import { createClient } from '@supabase/supabase-js';
import { sendTrialEndingEmail } from '../lib/email.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function runJob() {
  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find users whose trial ends within the next 48 hours and haven't been reminded yet
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, trial_ends_at, trial_reminder_sent')
      .eq('subscription_status', 'trialing')
      .eq('trial_reminder_sent', false)
      .gte('trial_ends_at', now.toISOString())
      .lte('trial_ends_at', in48h.toISOString());

    if (error) {
      console.error('[trialReminder] Failed to query profiles:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) return;

    console.log(`[trialReminder] Sending trial reminders to ${profiles.length} user(s)`);

    for (const profile of profiles) {
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.id);
        if (!authUser?.email) continue;

        const daysLeft = Math.max(1, Math.ceil((new Date(profile.trial_ends_at) - now) / (1000 * 60 * 60 * 24)));

        await sendTrialEndingEmail(authUser.email, daysLeft);

        await supabase
          .from('profiles')
          .update({ trial_reminder_sent: true })
          .eq('id', profile.id);

        console.log(`[trialReminder] Sent trial reminder to ${authUser.email} (${daysLeft} day(s) left)`);
      } catch (e) {
        console.error(`[trialReminder] Failed for profile ${profile.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[trialReminder] Job error:', e.message);
  }
}
