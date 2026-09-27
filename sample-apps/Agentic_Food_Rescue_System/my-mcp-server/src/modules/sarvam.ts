import dotenv from "dotenv";
import wavefile from "wavefile";
const { WaveFile } = wavefile;

dotenv.config();

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

export async function uploadAudioToPublicUrl(
  base64Data: string,
): Promise<string> {
  const rawBuffer = Buffer.from(base64Data, "base64");

  // Convert to 8kHz mu-law WAV for guaranteed Twilio compatibility
  const wav = new WaveFile(rawBuffer);
  wav.toSampleRate(8000);
  wav.toMuLaw();
  const muLawBuffer = Buffer.from(wav.toBuffer());

  const blob = new Blob([muLawBuffer], { type: "audio/wav" });
  const formData = new FormData();
  formData.append("files[]", blob, "audio.wav");

  // Try uguu.se first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("https://uguu.se/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const json = await res.json() as any;
      return json.files[0].url;
    }
  } catch (err) {
    console.error("uguu.se upload failed, trying fallback...", err);
  }

  // Fallback to tmpfiles.org
  console.log("Using tmpfiles.org fallback for audio hosting...");
  const fbData = new FormData();
  fbData.append("file", blob, "audio.wav");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  const res = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: fbData,
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  
  if (!res.ok) {
    throw new Error(`Failed to upload audio to tmpfiles: ${res.statusText}`);
  }
  
  const json = await res.json() as any;
  // Convert landing page URL to direct download URL
  return json.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
}

export async function synthesizeSpeech(
  text: string,
  languageCode: string,
): Promise<string> {
  if (!SARVAM_API_KEY) {
    console.warn("No SARVAM_API_KEY found, using mock audio URL");
    return "https://api.twilio.com/cowbell.mp3"; // mock audio
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let response;
    let data;
    try {
      response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: [text],
          target_language_code: languageCode + "-IN",
          speaker: "kavya",
          model: "bulbul:v3",
          speech_sample_rate: 8000,
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Sarvam TTS API Error Body:", errorText);
        throw new Error(`Sarvam TTS error: ${response.statusText}`);
      }
      data = (await response.json()) as any;
    } finally {
      clearTimeout(timeoutId);
    }
    console.error("Sarvam TTS returned success");

    // Twilio <Play> requires a public URL and has a strict 4000 character limit on TwiML.
    // We upload the base64 audio to a temporary public host (uguu.se) to get a short public URL.
    const publicUrl = await uploadAudioToPublicUrl(data.audios[0]);
    console.error(`Hosted Sarvam audio at: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error("Sarvam TTS failed:", error);
    return "https://api.twilio.com/cowbell.mp3";
  }
}

export async function transcribeResponse(
  audioUrl: string,
  languageCode: string,
): Promise<"yes" | "no" | "no_answer"> {
  if (!SARVAM_API_KEY) {
    console.warn("No SARVAM_API_KEY found, mocking transcription response");
    return "yes";
  }

  // Assuming Twilio gives us a URL to the recording, we'd fetch it and send to Sarvam
  // Here we mock the parsing logic since downloading and sending audio requires a bit more boilerplate
  // We'll simulate keyword matching
  console.error(`Transcribing audio from ${audioUrl} in ${languageCode}`);

  // Artificial delay to allow the call to actually ring and be answered before we send the SMS
  console.error("Waiting 15 seconds to simulate call duration and transcription time...");
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // Simulated response
  return "yes";
}

export function buildCallScript(
  donation: any,
  ngo: any,
  distanceKm: number,
): string {
  // Fallback to English if unknown language
  const lang = ngo.preferred_language || "en";

  // We can construct this in English and ideally use Sarvam Translate or predefined localized templates.
  if (lang === "ta") {
    return `வணக்கம், ${ngo.name}. ${distanceKm} கிலோமீட்டர் தொலைவில் ${donation.total_servings} பேருக்கு தேவையான ${donation.food_type} உணவு தயாராக உள்ளது. அடுத்த 2 மணி நேரத்திற்குள் இதை உங்களால் பெற்றுக்கொள்ள முடியுமா? ஆம் அல்லது இல்லை என்று கூறவும்.`;
  } else if (lang === "hi") {
    return `नमस्ते, ${ngo.name}. ${distanceKm} किलोमीटर दूर ${donation.total_servings} लोगों के लिए ${donation.food_type} खाना तैयार है। क्या आप इसे अगले 2 घंटों के भीतर प्राप्त कर सकते हैं? हाँ या ना कहें।`;
  } else {
    // English fallback
    return `Hello, ${ngo.name}. We have ${donation.total_servings} servings of ${donation.food_type} available at a distance of ${distanceKm} kilometers. Can you receive this within the next 2 hours? Please say yes or no.`;
  }
}

export function buildThankYouScript(lang: string): string {
  if (lang === "ta") {
    return "உங்கள் பதிலுக்கு நன்றி. நாங்கள் எங்கள் சிஸ்டத்தை அப்டேட் செய்கிறோம். வணக்கம்.";
  } else if (lang === "hi") {
    return "आपकी प्रतिक्रिया के लिए धन्यवाद। हम अपने सिस्टम को अपडेट करेंगे। अलविदा।";
  } else {
    return "Thank you for your response. We will update our system. Goodbye.";
  }
}
