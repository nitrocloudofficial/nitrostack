import process from "process";
import dotenv from "dotenv";
dotenv.config();
export async function postToSlack(message) {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url)
        throw new Error("SLACK_WEBHOOK_URL is not set");
    const payload = {
        text: message.text,
        channel: message.channel,
    };
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok)
        throw new Error(`Slack post failed: ${res.status}`);
}
export async function postToDiscord(message) {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url)
        throw new Error("DISCORD_WEBHOOK_URL is not set");
    const payload = {
        content: message.text,
    };
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok)
        throw new Error(`Discord post failed: ${res.status}`);
}
