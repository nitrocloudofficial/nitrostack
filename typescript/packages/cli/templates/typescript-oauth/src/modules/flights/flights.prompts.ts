import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';
import { DuffelService } from '../../services/duffel.service.js';

// Note: Using explicit deps for ESM compatibility
@Injectable({ deps: [DuffelService] })
export class FlightPrompts {
    constructor(private duffelService: DuffelService) { }

    @Prompt({
        name: 'flight_search_assistant',
        description: 'An AI assistant specialized in helping users search for flights, understand flight options, and make booking decisions.',
        arguments: [
            {
                name: 'userQuery',
                description: 'The user\'s flight search query or question',
                required: true
            },
            {
                name: 'context',
                description: 'Optional context including previous searches and selected offers',
                required: false
            }
        ]
    })
    async flightSearchAssistant(input: any, ctx: ExecutionContext) {
        const systemPrompt = `You are a professional flight booking assistant with expertise in helping travelers find flight information.

⚠️ CRITICAL: Only do what the user specifically asks. Do NOT assume additional steps.

Your capabilities:
- Search for airports using search_airports tool
- Search for flights using the search_flights tool
- Get detailed flight information using get_flight_details tool
- Help book flights when explicitly requested

**IMPORTANT RULES:**
1. If user asks about airports, ONLY search airports - do NOT search for flights
2. If user asks about flights, ONLY search flights - do NOT automatically book
3. If user asks to book, ONLY then proceed with booking workflow
4. NEVER chain operations unless user explicitly requests it

**EXAMPLES:**
- "show me airports in London" → search_airports("London") → show results → STOP
- "find flights from NYC to LAX" → search_flights → show results → STOP
- "book this flight" → THEN start booking workflow

BOOKING WORKFLOW (only when user explicitly wants to book):
1. FIRST, collect ALL passenger information (name, title, gender, date of birth, email, phone)
2. THEN, call create_order tool with complete passenger details
⚠️ NEVER call create_order without collecting passenger information first!
⚠️ All bookings are automatically held - no payment is required at booking time

Current user query: ${input.userQuery}

${input.context?.previousSearches?.length ? `Previous searches in this conversation:\n${JSON.stringify(input.context.previousSearches, null, 2)}` : ''}

Respond to EXACTLY what the user asked - nothing more.`;

        return {
            role: 'assistant',
            content: systemPrompt
        };
    }

    @Prompt({
        name: 'flight_comparison',
        description: 'Compare multiple flight offers and provide recommendations based on various factors.',
        arguments: [
            {
                name: 'offerIds',
                description: 'Flight offer IDs to compare (2-5 offers)',
                required: true
            },
            {
                name: 'priorities',
                description: 'User priorities for comparison (price, duration, stops, airline, departure_time, flexibility)',
                required: false
            }
        ]
    })
    async flightComparison(input: any, ctx: ExecutionContext) {
        const offers = await Promise.all(
            input.offerIds.map((id: string) => this.duffelService.getOffer(id))
        );

        const comparisonData = offers.map((offer: any) => {
            const outbound = offer.slices[0];
            return {
                offerId: offer.id,
                price: `${offer.total_amount} ${offer.total_currency}`,
                airline: outbound.segments[0].marketing_carrier.name,
                duration: outbound.duration,
                stops: outbound.segments.length - 1,
                departureTime: outbound.segments[0].departing_at,
                arrivalTime: outbound.segments[outbound.segments.length - 1].arriving_at,
                refundable: offer.conditions?.refund_before_departure?.allowed || false,
                changeable: offer.conditions?.change_before_departure?.allowed || false
            };
        });

        const priorities = input.priorities || ['price', 'duration', 'stops'];

        const prompt = `Compare these flight options and provide a recommendation:

${JSON.stringify(comparisonData, null, 2)}

User priorities: ${priorities.join(', ')}

Provide:
1. A clear comparison of the key differences
2. Pros and cons of each option
3. Your recommendation based on the user's priorities
4. Any important considerations (layover times, airline reputation, flexibility, etc.)`;

        return {
            role: 'assistant',
            content: prompt
        };
    }

    @Prompt({
        name: 'travel_tips',
        description: 'Provide travel tips and advice for a specific route and travel dates.',
        arguments: [
            {
                name: 'origin',
                description: 'Origin airport code',
                required: true
            },
            {
                name: 'destination',
                description: 'Destination airport code',
                required: true
            },
            {
                name: 'departureDate',
                description: 'Departure date',
                required: true
            },
            {
                name: 'tripType',
                description: 'Type of trip: business, leisure, or family',
                required: false
            }
        ]
    })
    async travelTips(input: any, ctx: ExecutionContext) {
        const prompt = `Provide helpful travel tips for a trip from ${input.origin} to ${input.destination} departing on ${input.departureDate}.

Include advice on:
1. Best time to book for this route
2. Typical weather at destination during this time
3. Airport tips (check-in, security, lounges)
4. Baggage recommendations
5. Connection considerations if applicable
6. Time zone differences and jet lag tips
${input.tripType ? `7. Specific tips for ${input.tripType} travel` : ''}

Be concise but informative.`;

        return {
            role: 'assistant',
            content: prompt
        };
    }

    @Prompt({
        name: 'booking_assistant',
        description: 'Guide users through the flight booking process, collecting all necessary passenger information before creating an order.',
        arguments: [
            {
                name: 'offerId',
                description: 'The flight offer ID the user wants to book',
                required: true
            },
            {
                name: 'passengerCount',
                description: 'Number of passengers (default: 1)',
                required: false
            }
        ]
    })
    async bookingAssistant(input: any, ctx: ExecutionContext) {
        const passengerCount = input.passengerCount || 1;

        const prompt = `You are helping the user book flight offer: ${input.offerId}

IMPORTANT BOOKING WORKFLOW:
Before you can create the order, you MUST collect the following information for ${passengerCount} passenger(s):

For EACH passenger, ask for:
1. **Title**: Mr, Ms, Mrs, Miss, or Dr
2. **Full Name**: First name and last name (as it appears on their passport/ID)
3. **Gender**: Male (M) or Female (F)
4. **Date of Birth**: In YYYY-MM-DD format (e.g., 1990-01-15)
5. **Email Address**: For booking confirmation
6. **Phone Number**: With country code (e.g., +1234567890)

COLLECTION STRATEGY:
- Ask for all information in a friendly, conversational way
- You can ask for multiple fields at once to make it efficient
- Validate the format (especially date of birth and email)
- Confirm all details with the user before proceeding

EXAMPLE QUESTIONS:
"Great! To complete your booking, I'll need some passenger details. Could you please provide:
- Full name (first and last)
- Title (Mr/Ms/Mrs/Miss/Dr)
- Date of birth (YYYY-MM-DD)
- Gender (M/F)
- Email address
- Phone number with country code"

BOOKING PROCESS:
Once you have ALL passenger information:
- Call create_order with the offer ID and passenger details
- The booking will be automatically held (no payment required)
- The user will receive booking confirmation with expiration details
- Payment can be completed later before the hold expires

DO NOT ask for payment details - all bookings are held by default.
ALWAYS inform the user that their booking is held and they have time to complete payment.`;

        return {
            role: 'assistant',
            content: prompt
        };
    }
}
