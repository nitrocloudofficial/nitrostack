import { askText } from "./llm.js";
import { getDataIntentNouns } from "./config.js";
const patterns=/(^|\s)(hi|hello|hey|thanks|thank you|who are you|help)(\s|$)/i;
export async function handleConversation(query:string) { const hasData=[...getDataIntentNouns()].some(w=>query.toLowerCase().includes(w)); if (hasData || !patterns.test(query)) return {is_conversational:false}; return {is_conversational:true, response:await askText("You are a concise ERP data assistant.",query,"Hello! Ask me a question about your ERP data.")}; }
