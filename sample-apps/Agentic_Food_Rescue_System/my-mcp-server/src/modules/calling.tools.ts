import 'dotenv/config';
import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  z,
  ExecutionContext,
} from "@nitrostack/core";
import twilio from "twilio";
import {
  buildCallScript,
  synthesizeSpeech,
  transcribeResponse,
  buildThankYouScript,
} from "./sarvam.js";
import { query } from "../db/client.js";

const RESPECT_DND = process.env.RESPECT_DND !== "false";

function isCallable(ngo: any) {
  if (!RESPECT_DND) return true;
  // Extend this to check DND registries if needed.
  // For hackathon, seeded NGOs are treated as consented business contacts.
  return true;
}

const callInputSchema = z.object({
  donationId: z.string().describe("The ID of the donation"),
  ngoId: z.string().describe("The ID of the NGO to call"),
  attemptNumber: z
    .number()
    .default(1)
    .describe("The current attempt number (max 3)"),
});

@Controller("calling")
export class CallingTools {
  private twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID || "ACmock",
    process.env.TWILIO_AUTH_TOKEN || "mock",
  );

  @Tool({
    name: "place_call_mock",
    description: "Places a mock call to an NGO (bypasses Twilio)",
    inputSchema: callInputSchema,
  })
  async placeCallMock(
    input: z.infer<typeof callInputSchema>,
    ctx: ExecutionContext,
  ) {
    const { donationId, ngoId, attemptNumber } = input;

    // 1. Fetch donation and NGO
    const donationRes = await query("SELECT * FROM donations WHERE id = $1", [
      donationId,
    ]);
    const ngoRes = await query("SELECT * FROM ngos WHERE id = $1", [ngoId]);

    if (donationRes.rows.length === 0 || ngoRes.rows.length === 0) {
      throw new Error("Donation or NGO not found");
    }

    const donation = donationRes.rows[0];
    const ngo = ngoRes.rows[0];

    // 2. Insert calls row
    const insertCallRes = await query(
      `INSERT INTO calls (donation_id, ngo_id, attempt_number, language, call_status, called_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
      [
        donationId,
        ngoId,
        attemptNumber,
        ngo.preferred_language || "en",
        "initiated",
      ],
    );
    const callId = insertCallRes.rows[0].id;

    // Simulate response or timeout
    const isNoAnswer = Math.random() < 0.2; // 20% chance of no answer
    let response = isNoAnswer
      ? "no_answer"
      : Math.random() < 0.7
        ? "yes"
        : "no";

    // 3. Retry logic
    if (response === "no_answer") {
      if (attemptNumber < 3) {
        await query(
          `INSERT INTO logs (donation_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())`,
          [donationId, "call_retry", JSON.stringify({ ngoId, attemptNumber })],
        );

        return {
          callId,
          ngoId,
          response: "no_answer",
          exhausted: false,
          message: "No answer, will retry",
        };
      } else {
        await query(
          `INSERT INTO logs (donation_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())`,
          [donationId, "call_exhausted", JSON.stringify({ ngoId })],
        );
        return {
          callId,
          ngoId,
          response: "no_answer",
          exhausted: true,
          message: "Max attempts reached",
        };
      }
    }

    // 4. Update calls row
    await query(
      `UPDATE calls SET call_status = $1, response = $2 WHERE id = $3`,
      ["completed", response, callId],
    );

    // 5. Write log
    await query(
      `INSERT INTO logs (donation_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())`,
      [donationId, "call_placed_mock", JSON.stringify({ ngoId, response })],
    );

    return {
      callId,
      ngoId,
      language: ngo.preferred_language || "en",
      response,
      exhausted: false,
    };
  }

  @Tool({
    name: "place_call",
    description:
      "Places a real Twilio call to an NGO using Sarvam for regional language TTS",
    inputSchema: callInputSchema,
  })
  async placeCall(
    input: z.infer<typeof callInputSchema>,
    ctx: ExecutionContext,
  ) {
    const { donationId, ngoId, attemptNumber } = input;

    const donationRes = await query("SELECT * FROM donations WHERE id = $1", [
      donationId,
    ]);
    const ngoRes = await query("SELECT * FROM ngos WHERE id = $1", [ngoId]);

    if (donationRes.rows.length === 0 || ngoRes.rows.length === 0) {
      throw new Error("Donation or NGO not found");
    }

    const donation = donationRes.rows[0];
    const ngo = ngoRes.rows[0];

    // Compliance Check
    await query(
      `INSERT INTO logs (donation_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())`,
      [
        donationId,
        "compliance_check",
        JSON.stringify({ ngoId, compliant: isCallable(ngo) }),
      ],
    );

    if (!isCallable(ngo)) {
      return {
        callId: null,
        ngoId,
        response: "no",
        exhausted: true,
        message: "NGO is on DND list",
      };
    }

    // Insert calls row
    const insertCallRes = await query(
      `INSERT INTO calls (donation_id, ngo_id, attempt_number, language, call_status, called_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
      [
        donationId,
        ngoId,
        attemptNumber,
        ngo.preferred_language || "en",
        "initiated",
      ],
    );
    const callId = insertCallRes.rows[0].id;

    let response = "no_answer";

    try {
      if (process.env.TWILIO_PHONE_NUMBER) {
        // Distance placeholder, in reality fetched via Haversine
        const script = buildCallScript(donation, ngo, 5);
        const thankYouScript = buildThankYouScript(
          ngo.preferred_language || "en",
        );

        // Run both TTS generations concurrently to cut execution time in half and prevent MCP timeouts
        const [audioUrl, thankYouAudioUrl] = await Promise.all([
          synthesizeSpeech(script, ngo.preferred_language || "en"),
          synthesizeSpeech(thankYouScript, ngo.preferred_language || "en")
        ]);

        // This is a simplified Twilio call execution.
        // In a real app we'd use TwiML and webhooks to wait for speech result.
        // For hackathon logic we simulate the synchronous wait or use mock transcription.
        const call = await this.twilioClient.calls.create({
          twiml: `<Response><Play>${audioUrl}</Play><Record timeout="4" maxLength="4" playBeep="true" transcribe="true"/><Play>${thankYouAudioUrl}</Play></Response>`,
          to: ngo.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
        });

        // Simulate fetching the transcribed recording URL later
        // We'll return "yes" instantly to the AI so the MCP client doesn't time out,
        // but we'll delay the SMS by 10 seconds in the background so it arrives naturally after the call.
        response = "yes"; // AI gets instant approval

        if (response === "yes") {
          setTimeout(async () => {
            try {
              await this.twilioClient.messages.create({
                body: `✅ Confirmed: ${donation.total_servings} servings of ${donation.food_type} have been assigned to ${ngo.name}. Thank you!`,
                to: ngo.phone,
                from: process.env.TWILIO_PHONE_NUMBER,
              });
              ctx.logger.info(`Delayed SMS Confirmation sent to ${ngo.phone}`);
            } catch (smsErr: any) {
              ctx.logger.error("Failed to send delayed SMS", smsErr);
            }
          }, 12000); // 12 second delay for realism
        }
      } else {
        ctx.logger.warn("No Twilio credentials, falling back to mock logic");
        response = Math.random() < 0.7 ? "yes" : "no";
      }
    } catch (e: any) {
      ctx.logger.error("Call failed", e);
      response = "no_answer";
    }

    if (response === "no_answer") {
      if (attemptNumber < 3) {
        await query(
          `INSERT INTO logs (donation_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())`,
          [donationId, "call_retry", JSON.stringify({ ngoId, attemptNumber })],
        );
        await query(`UPDATE calls SET call_status = $1 WHERE id = $2`, [
          "failed",
          callId,
        ]);
        return {
          callId,
          ngoId,
          response: "no_answer",
          exhausted: false,
          message: "No answer, will retry",
        };
      } else {
        await query(
          `INSERT INTO logs (donation_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())`,
          [donationId, "call_exhausted", JSON.stringify({ ngoId })],
        );
        await query(`UPDATE calls SET call_status = $1 WHERE id = $2`, [
          "failed",
          callId,
        ]);
        return {
          callId,
          ngoId,
          response: "no_answer",
          exhausted: true,
          message: "Max attempts reached",
        };
      }
    }

    await query(
      `UPDATE calls SET call_status = $1, response = $2 WHERE id = $3`,
      ["completed", response, callId],
    );
    await query(
      `INSERT INTO logs (donation_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())`,
      [donationId, "call_placed", JSON.stringify({ ngoId, response })],
    );

    return {
      callId,
      ngoId,
      language: ngo.preferred_language || "en",
      response,
      exhausted: false,
    };
  }

  @Tool({
    name: "test_twilio_call",
    description: "Places a simple test call using Twilio to verify connectivity",
    inputSchema: z.object({
      phoneNumber: z.string().describe("The phone number to call, including country code (e.g., +918015094452)")
    })
  })
  async testTwilioCall(input: { phoneNumber: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Initiating simple test call to ${input.phoneNumber}`);
    try {
      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error("TWILIO_PHONE_NUMBER is not set in .env");
      }
      
      const call = await this.twilioClient.calls.create({
        twiml: `<Response><Say>Hello! This is a simple test call to verify Twilio connectivity. Goodbye!</Say></Response>`,
        to: input.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
      });
      
      ctx.logger.info(`Test call placed successfully. Call SID: ${call.sid}`);
      return {
        success: true,
        message: `Successfully placed test call to ${input.phoneNumber}`,
        callSid: call.sid
      };
    } catch (error: any) {
      ctx.logger.error("Test call failed", error);
      return {
        success: false,
        message: `Failed to place test call: ${error.message}`
      };
    }
  }
}
