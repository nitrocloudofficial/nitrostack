import express, {
  Request,
  Response
} from 'express';

import twilio from 'twilio';
import dotenv from 'dotenv';

import {
  askScamShieldAI
} from './modules/scamshield/scamshield-agent.service.js';


// ============================================================
// ENVIRONMENT
// ============================================================

dotenv.config();


// ============================================================
// EXPRESS APP
// ============================================================

const app = express();


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  express.urlencoded({
    extended: false
  })
);

app.use(
  express.json()
);


// ============================================================
// TWILIO RESPONSE HELPER
// ============================================================

function sendTwilioReply(
  res: Response,
  message: string
): void {

  const twiml =
    new twilio.twiml.MessagingResponse();

  twiml.message(message);

  res
    .type('text/xml')
    .status(200)
    .send(
      twiml.toString()
    );
}


// ============================================================
// ERROR LOGGER
// ============================================================

function printError(
  label: string,
  error: unknown
): void {

  console.error(
    '\n========================================'
  );

  console.error(
    `❌ ${label}`
  );

  console.error(
    '========================================'
  );

  if (error instanceof Error) {

    console.error(
      'Name:',
      error.name
    );

    console.error(
      'Message:',
      error.message
    );

    console.error(
      'Stack:',
      error.stack
    );

  } else {

    console.error(
      error
    );
  }

  console.error(
    '========================================\n'
  );
}


// ============================================================
// SAFE FALLBACK RESPONSE
// ============================================================

function sendSafeFallback(
  res: Response
): void {

  sendTwilioReply(
    res,

    `🛡️ ScamShield

I could not analyse this message right now.

For your safety:

❌ Do not share OTPs, PINs, UPI PINs, CVVs or passwords.
❌ Do not send money because of an unexpected request.
❌ Do not open suspicious links.
✅ Verify the sender using the organisation's official website, app or phone number.`
  );
}


// ============================================================
// WHATSAPP WEBHOOK
// ============================================================

app.post(
  '/whatsapp',

  async (
    req: Request,
    res: Response
  ) => {

    console.log(
      '\n========================================'
    );

    console.log(
      '📱 WHATSAPP MESSAGE RECEIVED'
    );

    console.log(
      '========================================'
    );

    try {

      // ------------------------------------------------------
      // READ WHATSAPP MESSAGE
      // ------------------------------------------------------

      const incomingMessage =
        String(
          req.body.Body || ''
        ).trim();

      const sender =
        String(
          req.body.From || ''
        ).trim();


      console.log(
        'From:',
        sender
      );

      console.log(
        'Message:',
        incomingMessage
      );


      // ------------------------------------------------------
      // EMPTY MESSAGE CHECK
      // ------------------------------------------------------

      if (!incomingMessage) {

        sendTwilioReply(
          res,

          `🛡️ ScamShield

Please send the suspicious message, link or OTP request you want me to analyse.

Example:

"Your SBI account will be blocked today. Complete KYC at suspicious-link.com and send your OTP."`
        );

        return;
      }


      // ------------------------------------------------------
      // SEND MESSAGE TO SCAMSHIELD
      // ------------------------------------------------------

      console.log(
        '\n🛡️ Sending WhatsApp message to ScamShield...'
      );


      const result =
        await askScamShieldAI(
          incomingMessage
        );


      const reply =
        String(
          result || ''
        ).trim();


      // ------------------------------------------------------
      // CHECK RESPONSE
      // ------------------------------------------------------

      if (!reply) {

        throw new Error(
          'ScamShield returned an empty WhatsApp response'
        );
      }


      // ------------------------------------------------------
      // LOG RESULT
      // ------------------------------------------------------

      console.log(
        '\n========================================'
      );

      console.log(
        '✅ SCAMSHIELD WHATSAPP RESULT'
      );

      console.log(
        '========================================'
      );

      console.log(
        reply
      );

      console.log(
        '========================================\n'
      );


      // ------------------------------------------------------
      // SEND RESULT TO WHATSAPP
      // ------------------------------------------------------

      sendTwilioReply(
        res,
        reply
      );

    } catch (error) {

      printError(
        'WHATSAPP ERROR',
        error
      );

      sendSafeFallback(
        res
      );
    }
  }
);


// ============================================================
// ROOT
// ============================================================

app.get(
  '/',

  (
    _req: Request,
    res: Response
  ) => {

    res
      .status(200)
      .json({

        status:
          'ok',

        service:
          'ScamShield',

        description:
          'Explainable fraud prevention through WhatsApp',

        channel:
          'WhatsApp',

        poweredBy:
          'NitroStack MCP'

      });
  }
);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  '/health',

  (
    _req: Request,
    res: Response
  ) => {

    res
      .status(200)
      .json({

        status:
          'ok',

        service:
          'ScamShield WhatsApp Bridge',

        channel:
          'WhatsApp',

        features: {

          whatsapp:
            true,

          messageAnalysis:
            true,

          otpProtection:
            true,

          credentialProtection:
            true,

          linkAnalysis:
            true,

          phoneRiskAnalysis:
            true,

          bankImpersonationDetection:
            true,

          explainableRiskAssessment:
            true

        },

        mcpTools: [

          'otp_share_guard',

          'analyze_message_intent',

          'check_link_safety',

          'phone_number_risk_check',

          'verify_bank_identity'

        ],

        endpoints: {

          whatsapp:
            '/whatsapp',

          health:
            '/health'

        }

      });
  }
);


// ============================================================
// PORT
// ============================================================

const PORT =
  Number(
    process.env.TWILIO_WEBHOOK_PORT
  ) || 3002;


// ============================================================
// START SERVER
// ============================================================

const server =
  app.listen(
    PORT,
    '0.0.0.0',

    () => {

      console.log(
        '\n========================================'
      );

      console.log(
        '🛡️ SCAMSHIELD'
      );

      console.log(
        '========================================'
      );

      console.log(
        `🚀 Server running on port ${PORT}`
      );

      console.log(
        `📱 WhatsApp: http://localhost:${PORT}/whatsapp`
      );

      console.log(
        `❤️ Health: http://localhost:${PORT}/health`
      );

      console.log(
        ''
      );

      console.log(
        '🧠 ScamShield Features'
      );

      console.log(
        '✅ Message scam analysis'
      );

      console.log(
        '✅ OTP / credential protection'
      );

      console.log(
        '✅ Suspicious link analysis'
      );

      console.log(
        '✅ Phone number risk analysis'
      );

      console.log(
        '✅ Bank impersonation detection'
      );

      console.log(
        '✅ Explainable risk assessment'
      );

      console.log(
        '✅ WhatsApp'
      );

      console.log(
        ''
      );

      console.log(
        '🛠️ NitroStack MCP Tools'
      );

      console.log(
        '✅ otp_share_guard'
      );

      console.log(
        '✅ analyze_message_intent'
      );

      console.log(
        '✅ check_link_safety'
      );

      console.log(
        '✅ phone_number_risk_check'
      );

      console.log(
        '✅ verify_bank_identity'
      );

      console.log(
        '========================================\n'
      );
    }
  );


// ============================================================
// SERVER ERROR
// ============================================================

server.on(
  'error',

  (
    error
  ) => {

    printError(
      'SERVER ERROR',
      error
    );
  }
);


// ============================================================
// PROCESS ERRORS
// ============================================================

process.on(
  'uncaughtException',

  (
    error
  ) => {

    printError(
      'UNCAUGHT EXCEPTION',
      error
    );
  }
);


process.on(
  'unhandledRejection',

  (
    reason
  ) => {

    printError(
      'UNHANDLED REJECTION',
      reason
    );
  }
);