import { ResourceDecorator as Resource, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { DuffelService } from '../../services/duffel.service.js';

// Note: Using explicit deps for ESM compatibility
@Injectable({ deps: [DuffelService] })
export class FlightResources {
    constructor(private duffelService: DuffelService) { }

    @Resource({
        uri: 'flight://search-history',
        name: 'Flight Search History',
        description: 'Access to recent flight searches and their results',
        mimeType: 'application/json'
    })
    async getSearchHistory(ctx: ExecutionContext) {
        // In a real implementation, this would fetch from a database
        // For now, return a template structure
        return {
            searches: [],
            message: 'Search history will be stored here after performing searches'
        };
    }

    @Resource({
        uri: 'flight://popular-routes',
        name: 'Popular Flight Routes',
        description: 'Information about popular flight routes and typical pricing',
        mimeType: 'application/json'
    })
    async getPopularRoutes(ctx: ExecutionContext) {
        return {
            routes: [
                {
                    route: 'JFK → LAX',
                    description: 'New York to Los Angeles',
                    averageDuration: '6h 30m',
                    typicalPrice: '$200-400',
                    airlines: ['American Airlines', 'Delta', 'JetBlue', 'United']
                },
                {
                    route: 'LHR → JFK',
                    description: 'London to New York',
                    averageDuration: '8h 00m',
                    typicalPrice: '$400-800',
                    airlines: ['British Airways', 'American Airlines', 'Virgin Atlantic']
                },
                {
                    route: 'SFO → NRT',
                    description: 'San Francisco to Tokyo',
                    averageDuration: '11h 30m',
                    typicalPrice: '$600-1200',
                    airlines: ['United', 'ANA', 'Japan Airlines']
                },
                {
                    route: 'DXB → LHR',
                    description: 'Dubai to London',
                    averageDuration: '7h 30m',
                    typicalPrice: '$400-900',
                    airlines: ['Emirates', 'British Airways']
                }
            ],
            note: 'Prices are approximate and vary by season, booking time, and availability'
        };
    }

    @Resource({
        uri: 'flight://booking-guide',
        name: 'Flight Booking Guide',
        description: 'Comprehensive guide on how to search and book flights',
        mimeType: 'text/markdown'
    })
    async getBookingGuide(ctx: ExecutionContext) {
        return `# Flight Booking Guide

## How to Search for Flights

### 1. Prepare Your Information
- **Origin & Destination**: Use 3-letter IATA airport codes (e.g., JFK, LAX)
  - Use \`search_airports\` tool if you don't know the code
- **Dates**: Provide dates in YYYY-MM-DD format
- **Passengers**: Specify number of adults, children, and infants
- **Cabin Class**: Choose from economy, premium_economy, business, or first

### 2. Use the Search Tool
\`\`\`
search_flights({
  origin: "JFK",
  destination: "LAX",
  departureDate: "2024-03-15",
  returnDate: "2024-03-22",
  adults: 2,
  cabinClass: "economy"
})
\`\`\`

### 3. Review Results
- Compare prices, airlines, and flight times
- Check number of stops and total duration
- Review baggage allowance and fare conditions

### 4. Get Detailed Information
Use \`get_flight_details\` with an offer ID to see:
- Complete itinerary with all segments
- Baggage allowance per passenger
- Refund and change policies
- Payment requirements

## Tips for Best Results

### Flexible Dates
- Search multiple date combinations
- Weekday flights are often cheaper than weekends
- Avoid major holidays and peak seasons

### Direct vs. Connecting Flights
- Use \`maxConnections: 0\` for direct flights only
- Connecting flights are usually cheaper but take longer
- Consider layover duration and airport

### Cabin Class Selection
- **Economy**: Most affordable, basic amenities
- **Premium Economy**: More legroom and better service
- **Business**: Lie-flat seats, premium dining, lounge access
- **First**: Ultimate luxury, private suites, concierge service

### Booking Timing
- Book 2-3 months in advance for domestic flights
- Book 3-6 months in advance for international flights
- Last-minute deals exist but are risky

## Understanding Fare Conditions

### Refundable vs. Non-Refundable
- **Refundable**: Can cancel and get money back (usually more expensive)
- **Non-Refundable**: No refund if cancelled (cheaper)

### Change Policies
- Some fares allow changes with a fee
- Others don't allow any changes
- Check \`conditions\` in flight details

### Baggage Allowance
- **Carry-on**: Usually 1 bag + 1 personal item
- **Checked**: Varies by airline and fare class
- International flights typically include checked bags

## Booking Process

### Hold Orders
- All bookings are automatically held (no payment required at booking time)
- Price is guaranteed until the hold expires
- You'll receive an expiration time when booking

### Passenger Information Required
- Full legal name (as on passport/ID)
- Date of birth
- Gender
- Passport details for international flights

## After Booking

### Confirmation
- You'll receive a booking reference
- Save confirmation email
- Check-in opens 24 hours before departure

### Manage Your Booking
- Add seat selections
- Purchase extra baggage
- Add special meals or assistance
- Update passenger information

## Need Help?

Use the \`flight_search_assistant\` prompt for personalized assistance with:
- Finding the best flights for your needs
- Understanding complex itineraries
- Comparing different options
- Making booking decisions
`;
    }

    @Resource({
        uri: 'flight://airline-codes',
        name: 'Airline Codes Reference',
        description: 'Common airline IATA codes and names',
        mimeType: 'application/json'
    })
    async getAirlineCodes(ctx: ExecutionContext) {
        try {
            const airlines = await this.duffelService.getAirlines();
            return {
                airlines: airlines.slice(0, 50).map((airline: any) => ({
                    iataCode: airline.iata_code,
                    name: airline.name
                })),
                note: 'Showing top 50 airlines. More available through Duffel API.'
            };
        } catch (error) {
            // Return common airlines if API call fails
            return {
                airlines: [
                    { iataCode: 'AA', name: 'American Airlines' },
                    { iataCode: 'DL', name: 'Delta Air Lines' },
                    { iataCode: 'UA', name: 'United Airlines' },
                    { iataCode: 'BA', name: 'British Airways' },
                    { iataCode: 'LH', name: 'Lufthansa' },
                    { iataCode: 'AF', name: 'Air France' },
                    { iataCode: 'EK', name: 'Emirates' },
                    { iataCode: 'QR', name: 'Qatar Airways' }
                ],
                note: 'Common airlines. Use search_airports tool for complete list.'
            };
        }
    }
}
