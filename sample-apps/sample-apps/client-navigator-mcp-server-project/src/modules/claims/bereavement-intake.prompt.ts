/**
 * PROMPT: bereavement_intake
 * 
 * Guided intake template for someone recently bereaved.
 * Asks ONE question at a time. Never requests documents in bulk up front.
 * Never uses legal jargon without explaining it.
 * Establishes: will → assets → nominee status per asset.
 * Then calls tools and explains gently.
 * Offers single-institution path if person seems overwhelmed.
 */

import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class BereavementIntakePrompt {
  @Prompt({
    name: 'bereavement_intake',
    description:
      'Guided intake template for someone recently bereaved. Asks one question at a time. Establishes will status, known assets, and nominee status per asset. Never requests documents in bulk. Offers single-institution path if overwhelmed. Available in English, Tamil, and Hindi.',
    arguments: [
      {
        name: 'language',
        description: 'Language for the intake: english, tamil, or hindi',
        required: false,
      },
      {
        name: 'claimantRelationship',
        description:
          'Relationship of the claimant to the deceased: spouse, son, daughter, mother, father, or other',
        required: false,
      },
    ],
  })
  async execute(args: any, ctx: ExecutionContext) {
    const language = args.language || 'english';
    const claimantRelationship = args.claimantRelationship || 'other';

    if (language === 'tamil') {
      return [
        {
          role: 'user' as const,
          content: 'நான் சொத்துக்களை கோரிக்கை செய்ய உதவி தேவை.',
        },
        {
          role: 'assistant' as const,
          content: `வணக்கம். உங்கள் குடும்பத்தின் சொத்துக்களை கோரிக்கை செய்ய உதவ நான் இங்கே இருக்கிறேன்.

முதலில், ஒரு எளிய கேள்வி: உங்கள் குடும்ப உறுப்பினர் ஒரு உயிலை விட்டுச் சென்றார்களா?

(ஆம் / இல்லை)

உயில் என்பது ஒரு சட்ட ஆவணம் ஆகும், இதில் ஒரு நபர் அவர்களின் சொத்துக்கள் யாருக்கு செல்ல வேண்டும் என்பதை குறிப்பிடுகிறார்கள்.`,
        },
      ];
    } else if (language === 'hindi') {
      return [
        {
          role: 'user' as const,
          content: 'मुझे संपत्ति का दावा करने में मदद चाहिए।',
        },
        {
          role: 'assistant' as const,
          content: `नमस्ते। मैं आपके परिवार की संपत्ति का दावा करने में मदद करने के लिए यहाँ हूँ।

पहले, एक सरल सवाल: क्या आपके परिवार के सदस्य ने एक वसीयत छोड़ी है?

(हाँ / नहीं)

वसीयत एक कानूनी दस्तावेज है जिसमें एक व्यक्ति यह निर्दिष्ट करता है कि उनकी संपत्ति किसे जानी चाहिए।`,
        },
      ];
    } else {
      // English
      return [
        {
          role: 'user' as const,
          content: 'I need help claiming assets.',
        },
        {
          role: 'assistant' as const,
          content: `Hello. I'm here to help your family claim what was left behind.

Let's start with one simple question: Did the deceased leave a will?

(Yes / No)

A will is a legal document where a person says who should get their money and property after they die.

Once you answer, I'll ask about the assets you know about — bank accounts, insurance, provident fund, shares, etc. We'll take it one step at a time. There's no rush.`,
        },
      ];
    }
  }
}
