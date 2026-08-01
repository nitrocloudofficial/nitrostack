import { getSupabaseClient } from './supabase.service.js';

export async function sendWhatsAppNotification(mobile: string, message: string): Promise<void> {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[Notification] WhatsApp fallback (Twilio not configured) → ${mobile}: ${message}`);
    return;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:${mobile}`,
          From: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
          Body: message,
        }),
      }
    );
    if (!response.ok) {
      console.warn(`[Notification] Twilio send failed for ${mobile}: ${response.status}`);
    }
  } catch (error) {
    console.warn(`[Notification] Twilio unavailable, logged instead: ${mobile} — ${message}`);
  }
}

export async function notifyBuyersAboutForecast(
  buyerIds: string[],
  materialType: string,
  quantityKg: number,
  date: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: factories } = await supabase
      .from('factories')
      .select('mobile, whatsapp_opt_in')
      .in('id', buyerIds)
      .eq('whatsapp_opt_in', true);

    if (!factories || factories.length === 0) {
      console.log('[Notification] No WhatsApp-opted-in buyers found for forecast');
      return;
    }

    const message = `CircuLink: ${quantityKg}kg of ${materialType.replace(/_/g, ' ')} expected by ${date}. Pre-matched for your needs.`;

    for (const factory of factories) {
      await sendWhatsAppNotification(factory.mobile, message);
    }
  } catch (error) {
    console.warn('[Notification] Forecast notification skipped (Supabase/Twilio unavailable):', (error as Error).message);
  }
}
