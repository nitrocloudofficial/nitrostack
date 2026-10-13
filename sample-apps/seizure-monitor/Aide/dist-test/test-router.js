import { handleRequest } from './src/router.js';
const tests = [
    { text: 'Meeting for Isha and Sariga', userId: '2' },
    { text: 'Book a meeting with alice and bob for incident review, assign postmortem to charlie, post to #incidents', userId: '1' },
    { text: 'Schedule a call for Priya, Neel and Ravi', userId: '3' },
];
for (const t of tests) {
    const result = await handleRequest({ ...t, timestamp: new Date().toISOString() });
    console.log(`\n--- Request: "${t.text}" ---`);
    console.log('Attendees:', result.schedulingResult?.attendees);
    console.log('Owner:', result.delegationResult?.owner ?? 'N/A');
    console.log('Channel:', result.finalMessage.channel);
    console.log('Message:', result.finalMessage.text);
}
