import dotenv from 'dotenv';

import {
  askScamShieldAI
} from './modules/scamshield/scamshield-agent.service.js';

dotenv.config();

async function test() {

  console.log('🤖 Testing ScamShield AI...\n');

  const result = await askScamShieldAI(
    'Your bank account will be blocked today. Click http://fake-bank-login.com and enter your OTP immediately.'
  );

  console.log(result);
}

test();