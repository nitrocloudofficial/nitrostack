# OAuth 2.1 Template

## Overview

The OAuth 2.1 Template demonstrates enterprise-grade authentication with a complete flight booking system. It showcases OAuth 2.1 integration, protected tools, and interactive widgets for searching flights, viewing details, and managing bookings.

## What's Included

- **OAuth 2.1 Authentication** - Complete Auth0 integration with token management
- **Flight Booking Module** - Search, book, and manage flight reservations
- **7 Protected Tools** - All require authentication
- **7 Interactive Widgets** - Rich UI for flight search, selection, and booking
- **Duffel API Integration** - Real flight data (API key required)
- **Token Refresh** - Automatic token renewal
- **Protected Resources** - Flight booking guide and airline codes

## Quick Start

### Create Project

```bash
npx @nitrostack/cli init my-flights --template typescript-oauth
cd my-flights
```

### Configure OAuth

1. Copy `.env.example` to `.env`
2. Set up Auth0 (or your OAuth provider):
   - Create an application
   - Configure callback URLs
   - Get client credentials

3. Update `.env`:
```bash
RESOURCE_URI=https://your-api
AUTH_SERVER_URL=https://your-auth0-domain.auth0.com
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
AUDIENCE=https://your-api
```

4. (Optional) Add Duffel API key for real flight data:
```bash
DUFFEL_API_KEY=your_duffel_api_key
```

### Run Development

```bash
npm run dev
```

Starts:
- MCP Server with OAuth on HTTP (port 3002)
- Studio on http://localhost:3000
- Widget Dev Server on http://localhost:3001

## Project Structure

```
src/
├── modules/
│   └── flights/
│       ├── flights.module.ts          # Module definition
│       ├── flights.tools.ts           # Flight search/booking tools
│       ├── booking.tools.ts           # Order management tools
│       ├── flights.resources.ts       # Flight resources
│       └── flights.prompts.ts         # Conversation templates
├── services/
│   └── duffel.service.ts              # Duffel API integration
├── guards/
│   └── oauth.guard.ts                 # OAuth protection
├── widgets/
│   └── app/
│       ├── flight-search-results/     # Search results grid
│       ├── flight-details/            # Flight information
│       ├── airport-search/            # Airport autocomplete
│       ├── seat-selection/            # Seat map
│       ├── order-summary/             # Booking confirmation
│       ├── payment-confirmation/      # Payment success
│       └── order-cancellation/        # Cancellation status
├── app.module.ts                      # Root module with OAuth
└── index.ts                           # Bootstrap
```

## Features

### Protected Tools

All tools require valid OAuth token:

```typescript
@UseGuards(OAuthGuard)
@Tool({
  name: 'search_flights',
  description: 'Search for flights between airports'
})
async searchFlights(input: any, ctx: ExecutionContext) {
  // Only accessible with valid token
}
```

### Flight Search

Search flights with filters:
- Origin and destination airports
- Departure and return dates
- Number of passengers
- Cabin class (economy, business, first)

### Airport Search

Autocomplete airport search with:
- City and airport name matching
- IATA code lookup
- Country filtering

### Flight Details

View comprehensive flight information:
- Airline and flight numbers
- Departure/arrival times
- Duration and layovers
- Aircraft type
- Baggage allowance

### Seat Selection

Interactive seat map showing:
- Available seats
- Seat types (window, aisle, middle)
- Extra legroom seats
- Occupied seats

### Order Management

- Create bookings (hold or payment)
- View order details
- Cancel orders
- Get seat maps

## Widgets

### Flight Search Results Widget
- Grid layout of available flights
- Price comparison
- Duration and stops display
- Select flight action

### Flight Details Widget
- Complete itinerary
- Segment breakdown
- Pricing information
- Booking action

### Airport Search Widget
- Autocomplete search
- Airport details
- IATA codes
- Selection interface

### Seat Selection Widget
- Interactive seat map
- Seat type indicators
- Selection state
- Confirmation

### Order Summary Widget
- Booking confirmation
- Passenger details
- Payment status
- Order reference

## OAuth Flow

1. **User Initiates**: User tries to use a protected tool
2. **Auth Challenge**: Server returns OAuth authorization URL
3. **User Authorizes**: User completes OAuth flow in browser
4. **Token Exchange**: Server exchanges code for access token
5. **Tool Access**: User can now access protected tools
6. **Token Refresh**: Automatic renewal when token expires

## Configuration

### OAuth Providers

Supports any OAuth 2.1 compliant provider:
- Auth0
- Okta
- Azure AD
- Google
- Custom providers

### Environment Variables

```bash
# OAuth Configuration
RESOURCE_URI=https://your-api
AUTH_SERVER_URL=https://provider.com
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
AUDIENCE=https://your-api
SCOPES=read,write,admin

# Duffel API (Optional)
DUFFEL_API_KEY=your_key

# Server Configuration
PORT=3002
NODE_ENV=development
```

## Example Usage

### Search Flights
```
User: "Find flights from NYC to LAX next week"
AI: Calls search_flights (requires auth)
Result: Widget showing available flights with prices
```

### View Flight Details
```
User: "Show me details for the first flight"
AI: Calls get_flight_details
Result: Widget with complete flight information
```

### Book Flight
```
User: "Book this flight for 2 passengers"
AI: Calls create_order
Result: Widget with booking confirmation
```

## Extending the Template

### Add More Airlines

Integrate additional flight APIs in `duffel.service.ts`.

### Add Payment Processing

1. Integrate payment provider (Stripe, PayPal)
2. Add payment tools
3. Create payment widgets

### Add User Profiles

1. Create user service
2. Add profile tools
3. Store booking history

## Commands

```bash
npm run dev              # Start dev server with Studio
npm run build            # Build for production
npm start                # Run production server
```

## Security

- OAuth 2.1 compliant
- Secure token storage
- Automatic token refresh
- PKCE support
- Scope-based access control

## Next Steps

- [OAuth 2.1 Authentication](../sdk/typescript/11-oauth-authentication.md)
- [Authentication Overview](../sdk/typescript/09-authentication-overview.md)
- [Guards API Reference](../api-reference/guards.md)
- [Starter Template](./01-starter-template.md) - Learn the basics
- [Pizzaz Template](./03-pizzaz-template.md) - Widget features

## Use Cases

Perfect for building:
- Travel booking systems
- E-commerce platforms
- SaaS applications
- Enterprise integrations
- Protected API access
