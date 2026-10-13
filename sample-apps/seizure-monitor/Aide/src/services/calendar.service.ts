import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export interface BusyRange {
  start: string;
  end: string;
}

export interface PersonAvailability {
  busy: BusyRange[];
  workingHours: { start: string; end: string };
}

export type AvailabilityMap = Record<string, PersonAvailability>;

/**
 * Resolve a name or email into a full email address using DB lookup.
 */
export async function resolveEmployeeEmail(input: string): Promise<string> {
  const cleanInput = input.trim().toLowerCase();

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { email: cleanInput },
        { name: cleanInput }
      ]
    }
  });

  if (member && member.email) {
    return member.email.toLowerCase().trim();
  }

  if (cleanInput.includes("@")) {
    return cleanInput;
  }

  const domain = process.env.COMPANY_DOMAIN || "gmail.com";
  return `${cleanInput}@${domain}`;
}

export function extractUsername(emailOrName: string): string {
  return emailOrName.split("@")[0].toLowerCase().trim();
}

async function fetchGoogleFreeBusy(
  emails: string[],
  timeMin: string,
  timeMax: string,
  apiKey: string
): Promise<AvailabilityMap> {
  const url = `https://www.googleapis.com/calendar/v3/freeBusy?key=${apiKey}`;
  const body = {
    timeMin,
    timeMax,
    items: emails.map((e) => ({ id: e })),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API Error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as any;
  const result: AvailabilityMap = {};

  for (const email of emails) {
    const calData = data.calendars?.[email];
    const busyBlocks: BusyRange[] = (calData?.busy ?? []).map((b: any) => ({
      start: b.start,
      end: b.end,
    }));

    const startW = process.env.WORKING_HOURS_START || "03:30:00Z";
    const endW = process.env.WORKING_HOURS_END || "12:30:00Z";

    result[email] = {
      busy: busyBlocks,
      workingHours: {
        start: `${timeMin.slice(0, 10)}T${startW}`,
        end: `${timeMin.slice(0, 10)}T${endW}`,
      },
    };
  }

  return result;
}

export async function getAvailabilityForAttendees(
  attendeeInputs: string[],
  timeMin: string,
  timeMax: string
): Promise<{ availability: AvailabilityMap; isLive: boolean }> {
  const resolvedEmails = await Promise.all(attendeeInputs.map(resolveEmployeeEmail));
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

  if (apiKey) {
    try {
      const liveData = await fetchGoogleFreeBusy(
        resolvedEmails,
        timeMin,
        timeMax,
        apiKey
      );
      return { availability: liveData, isLive: true };
    } catch (err: any) {
      console.warn(`[CalendarService] Live API fetch failed, falling back to local data:`, err.message);
    }
  }

  const mockData: AvailabilityMap = {};
  for (const input of attendeeInputs) {
    const email = await resolveEmployeeEmail(input);
    const member = await prisma.member.findUnique({
      where: { email },
      include: { calendarWorkingHours: true, calendarBusyBlocks: true }
    });

    const startW = process.env.WORKING_HOURS_START || "03:30:00Z";
    const endW = process.env.WORKING_HOURS_END || "12:30:00Z";

    const wh = member?.calendarWorkingHours;
    mockData[email] = {
      busy: member?.calendarBusyBlocks?.map((b: any) => ({ start: b.start, end: b.end })) ?? [],
      workingHours: {
        start: `${timeMin.slice(0, 10)}T${wh?.start || startW}`,
        end: `${timeMin.slice(0, 10)}T${wh?.end || endW}`,
      },
    };
  }

  return { availability: mockData, isLive: false };
}

async function sendEtherealInvite(attendees: string[], summary: string, startTime: string) {
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user, 
        pass: testAccount.pass, 
      },
    });

    const info = await transporter.sendMail({
      from: '"NitroStack Scheduler" <scheduler@nitrostack.com>',
      to: attendees.join(', '),
      subject: `Meeting Invite: ${summary}`,
      text: `You have been invited to ${summary} at ${startTime}.`,
      html: `<b>You have been invited to ${summary} at ${startTime}.</b>`
    });

    console.log(`[CalendarService] 📧 Email invites sent to attendees! Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (e) {
    console.error("[CalendarService] Failed to send mock email invite", e);
  }
}

export async function bookGoogleCalendarEvent(
  attendees: string[],
  startTime: string,
  endTime: string,
  summary: string = "Scheduled Meeting"
): Promise<{ confirmed: boolean; meetingId: string; live: boolean }> {
  
  const keyFilePath = path.join(process.cwd(), '.data', 'google-credentials.json');
  
  await sendEtherealInvite(attendees, summary, startTime);

  if (fs.existsSync(keyFilePath)) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
      });

      const calendar = google.calendar({ version: 'v3', auth });

      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description: `Attendees: ${attendees.join(', ')}`,
          start: { dateTime: startTime },
          end: { dateTime: endTime },
        }
      });

      if (res.data && res.data.id) {
        // Record busy blocks in local DB
        for (const attendeeEmail of attendees) {
          const email = await resolveEmployeeEmail(attendeeEmail);
          const member = await prisma.member.findUnique({ where: { email } });
          if (member) {
            await prisma.calendarBusyBlock.create({
              data: {
                start: startTime,
                end: endTime,
                memberId: member.id
              }
            });
          }
        }
        return { confirmed: true, meetingId: res.data.id, live: true };
      }
    } catch (err: any) {
      console.warn(`[CalendarService] Live API insert failed via Service Account:`, err.message);
    }
  } else {
    console.warn(`[CalendarService] .data/google-credentials.json not found. Falling back to mock booking.`);
  }

  // Record busy blocks in local DB for mock meetings too
  for (const attendeeEmail of attendees) {
    const email = await resolveEmployeeEmail(attendeeEmail);
    const member = await prisma.member.findUnique({ where: { email } });
    if (member) {
      await prisma.calendarBusyBlock.create({
        data: {
          start: startTime,
          end: endTime,
          memberId: member.id
        }
      });
    }
  }

  return {
    confirmed: true,
    meetingId: `mock-meeting-${Date.now()}-${attendees[0]?.split("@")[0] || "unknown"}`,
    live: false,
  };
}
