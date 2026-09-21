import { ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards, Injectable } from '@nitrostack/core';
import { OAuthGuard } from '../../guards/oauth.guard.js';
import { DuffelService } from '../../services/duffel.service.js';
import { format } from 'date-fns';

// Note: Using explicit deps for ESM compatibility
@Injectable({ deps: [DuffelService] })
export class FlightTools {
    constructor(private duffelService: DuffelService) { }

    @Tool({
        name: 'search_flights',
        description: 'Search for flight offers based on origin, destination, dates, and preferences. Returns available flight options with pricing and details.',
        inputSchema: z.object({
            origin: z.string().length(3).describe('Origin airport IATA code (e.g., "JFK", "LHR")'),
            destination: z.string().length(3).describe('Destination airport IATA code (e.g., "LAX", "CDG")'),
            departureDate: z.string().describe('Departure date in YYYY-MM-DD format'),
            returnDate: z.string().optional().describe('Return date in YYYY-MM-DD format for round trip'),
            adults: z.number().min(1).max(9).default(1).describe('Number of adult passengers (18+)'),
            children: z.number().min(0).max(9).default(0).describe('Number of child passengers (2-17)'),
            infants: z.number().min(0).max(9).default(0).describe('Number of infant passengers (under 2)'),
            cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy').describe('Preferred cabin class'),
            maxConnections: z.number().min(0).max(3).optional().describe('Maximum number of connections (0 for direct flights only)'),
            departureTimeFrom: z.string().optional().describe('Earliest departure time in HH:MM format'),
            departureTimeTo: z.string().optional().describe('Latest departure time in HH:MM format')
        }),
        examples: {
            request: {
                origin: 'JFK',
                destination: 'LAX',
                departureDate: '2024-03-15',
                returnDate: '2024-03-22',
                adults: 2,
                cabinClass: 'economy'
            },
            response: {
                requestId: 'orq_123456',
                searchParams: {
                    origin: 'JFK',
                    destination: 'LAX',
                    departureDate: '2024-03-15',
                    returnDate: '2024-03-22',
                    passengers: {
                        adults: 2,
                        children: 0,
                        infants: 0
                    },
                    cabinClass: 'economy'
                },
                totalOffers: 15,
                offers: [
                    {
                        id: 'off_123456',
                        totalAmount: '450.00',
                        totalCurrency: 'USD',
                        expiresAt: '2024-03-01T12:00:00Z',
                        outbound: {
                            origin: 'JFK',
                            destination: 'LAX',
                            departureTime: '2024-03-15T08:00:00Z',
                            arrivalTime: '2024-03-15T14:30:00Z',
                            duration: 'PT6H30M',
                            stops: 0,
                            airline: 'American Airlines',
                            flightNumber: 'AA123',
                            segments: []
                        },
                        return: {
                            origin: 'LAX',
                            destination: 'JFK',
                            departureTime: '2024-03-22T16:00:00Z',
                            arrivalTime: '2024-03-23T00:30:00Z',
                            duration: 'PT5H30M',
                            stops: 0,
                            airline: 'American Airlines',
                            flightNumber: 'AA456',
                            segments: []
                        },
                        fareType: 'Domestic',
                        refundable: false,
                        changeable: true
                    }
                ],
                message: 'Found 15 flight options. Showing top 10 results.'
            }
        }
    })
    @UseGuards(OAuthGuard)
    @Widget('flight-search-results')
    async searchFlights(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Searching for flights', {
            user: ctx.auth?.subject,
            origin: input.origin,
            destination: input.destination,
            departureDate: input.departureDate
        });

        // Ensure we have passenger counts with defaults
        const adults = input.adults || 1;
        const children = input.children || 0;
        const infants = input.infants || 0;

        // Build passengers array
        const passengers: any[] = [];
        for (let i = 0; i < adults; i++) {
            passengers.push({ type: 'adult' });
        }
        for (let i = 0; i < children; i++) {
            passengers.push({ type: 'child', age: 12 }); // Default age for children
        }
        for (let i = 0; i < infants; i++) {
            passengers.push({ type: 'infant_without_seat' });
        }

        // Build time filters if provided
        const departureTime = input.departureTimeFrom && input.departureTimeTo
            ? { from: input.departureTimeFrom, to: input.departureTimeTo }
            : undefined;

        ctx.logger.info('Calling Duffel service with passengers:', {
            passengersCount: passengers.length,
            passengers: passengers,
            adults: adults,
            children: children,
            infants: infants
        });

        const result = await this.duffelService.searchFlights({
            origin: input.origin.toUpperCase(),
            destination: input.destination.toUpperCase(),
            departureDate: input.departureDate,
            returnDate: input.returnDate,
            passengers,
            cabinClass: input.cabinClass,
            maxConnections: input.maxConnections,
            departureTime
        });

        // Transform offers for better presentation
        const offers = result.offers.map((offer: any) => {
            const outboundSlice = offer.slices[0];
            const returnSlice = offer.slices[1];

            return {
                id: offer.id,
                totalAmount: offer.total_amount,
                totalCurrency: offer.total_currency,
                expiresAt: offer.expires_at,

                // Outbound flight details
                outbound: {
                    origin: outboundSlice.origin.iata_code,
                    destination: outboundSlice.destination.iata_code,
                    departureTime: outboundSlice.segments[0].departing_at,
                    arrivalTime: outboundSlice.segments[outboundSlice.segments.length - 1].arriving_at,
                    duration: outboundSlice.duration,
                    stops: outboundSlice.segments.length - 1,
                    airline: outboundSlice.segments[0].marketing_carrier.name,
                    flightNumber: outboundSlice.segments[0].marketing_carrier_flight_number,
                    segments: outboundSlice.segments.map((seg: any) => ({
                        origin: seg.origin.iata_code,
                        destination: seg.destination.iata_code,
                        departingAt: seg.departing_at,
                        arrivingAt: seg.arriving_at,
                        airline: seg.marketing_carrier.name,
                        flightNumber: seg.marketing_carrier_flight_number,
                        aircraft: seg.aircraft?.name
                    }))
                },

                // Return flight details (if round trip)
                ...(returnSlice && {
                    return: {
                        origin: returnSlice.origin.iata_code,
                        destination: returnSlice.destination.iata_code,
                        departureTime: returnSlice.segments[0].departing_at,
                        arrivalTime: returnSlice.segments[returnSlice.segments.length - 1].arriving_at,
                        duration: returnSlice.duration,
                        stops: returnSlice.segments.length - 1,
                        airline: returnSlice.segments[0].marketing_carrier.name,
                        flightNumber: returnSlice.segments[0].marketing_carrier_flight_number,
                        segments: returnSlice.segments.map((seg: any) => ({
                            origin: seg.origin.iata_code,
                            destination: seg.destination.iata_code,
                            departingAt: seg.departing_at,
                            arrivingAt: seg.arriving_at,
                            airline: seg.marketing_carrier.name,
                            flightNumber: seg.marketing_carrier_flight_number,
                            aircraft: seg.aircraft?.name
                        }))
                    }
                }),

                // Fare details
                fareType: offer.passenger_identity_documents_required ? 'International' : 'Domestic',
                refundable: offer.conditions?.refund_before_departure?.allowed || false,
                changeable: offer.conditions?.change_before_departure?.allowed || false
            };
        });

        ctx.logger.info('Flight search completed', {
            user: ctx.auth?.subject,
            offersFound: offers.length
        });

        return {
            requestId: result.id,
            searchParams: {
                origin: input.origin.toUpperCase(),
                destination: input.destination.toUpperCase(),
                departureDate: input.departureDate,
                returnDate: input.returnDate,
                passengers: {
                    adults: adults,
                    children: children,
                    infants: infants
                },
                cabinClass: input.cabinClass
            },
            totalOffers: offers.length,
            offers: offers.slice(0, 10), // Return top 10 offers
            message: `Found ${offers.length} flight options. Showing top 10 results.`
        };
    }

    @Tool({
        name: 'get_flight_details',
        description: 'Get detailed information about a specific flight offer including baggage allowance, fare conditions, and seat availability.',
        inputSchema: z.object({
            offerId: z.string().describe('The offer ID from search results')
        }),
        examples: {
            request: {
                offerId: 'off_123456'
            },
            response: {
                id: 'off_123456',
                totalAmount: '450.00',
                totalCurrency: 'USD',
                expiresAt: '2024-03-01T12:00:00Z',
                slices: [
                    {
                        origin: {
                            code: 'JFK',
                            name: 'John F. Kennedy International Airport',
                            city: 'New York'
                        },
                        destination: {
                            code: 'LAX',
                            name: 'Los Angeles International Airport',
                            city: 'Los Angeles'
                        },
                        duration: 'PT6H30M',
                        segments: [
                            {
                                id: 'seg_123',
                                origin: 'JFK',
                                destination: 'LAX',
                                departingAt: '2024-03-15T08:00:00Z',
                                arrivingAt: '2024-03-15T14:30:00Z',
                                duration: 'PT6H30M',
                                airline: {
                                    name: 'American Airlines',
                                    code: 'AA',
                                    flightNumber: '123'
                                },
                                aircraft: 'Boeing 777-300ER'
                            }
                        ]
                    }
                ],
                passengers: [
                    {
                        id: 'pas_123',
                        type: 'adult',
                        fareType: 'economy',
                        baggageAllowance: [
                            {
                                type: 'checked',
                                quantity: 1
                            },
                            {
                                type: 'carry_on',
                                quantity: 1
                            }
                        ]
                    }
                ],
                conditions: {
                    refundBeforeDeparture: {
                        allowed: false
                    },
                    changeBeforeDeparture: {
                        allowed: true,
                        penaltyAmount: '75.00',
                        penaltyCurrency: 'USD'
                    }
                },
                paymentRequirements: {
                    requiresInstantPayment: true,
                    priceGuaranteeExpiresAt: '2024-03-01T12:00:00Z'
                }
            }
        }
    })
    @UseGuards(OAuthGuard)
    @Widget('flight-details')
    async getFlightDetails(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Getting flight details', {
            user: ctx.auth?.subject,
            offerId: input.offerId
        });

        const offer = await this.duffelService.getOffer(input.offerId);

        return {
            id: offer.id,
            totalAmount: offer.total_amount,
            totalCurrency: offer.total_currency,
            expiresAt: offer.expires_at,

            slices: offer.slices.map((slice: any) => ({
                origin: {
                    code: slice.origin.iata_code,
                    name: slice.origin.name,
                    city: slice.origin.city_name
                },
                destination: {
                    code: slice.destination.iata_code,
                    name: slice.destination.name,
                    city: slice.destination.city_name
                },
                duration: slice.duration,
                segments: slice.segments.map((seg: any) => ({
                    id: seg.id,
                    origin: seg.origin.iata_code,
                    destination: seg.destination.iata_code,
                    departingAt: seg.departing_at,
                    arrivingAt: seg.arriving_at,
                    duration: seg.duration,
                    airline: {
                        name: seg.marketing_carrier.name,
                        code: seg.marketing_carrier.iata_code,
                        flightNumber: seg.marketing_carrier_flight_number
                    },
                    aircraft: seg.aircraft?.name,
                    operatingCarrier: seg.operating_carrier?.name,
                    distance: seg.distance
                }))
            })),

            passengers: offer.passengers.map((pax: any) => ({
                id: pax.id,
                type: pax.type,
                fareType: pax.fare_type,
                baggageAllowance: pax.baggages?.map((bag: any) => ({
                    type: bag.type,
                    quantity: bag.quantity
                }))
            })),

            conditions: {
                refundBeforeDeparture: {
                    allowed: offer.conditions?.refund_before_departure?.allowed || false,
                    penaltyAmount: offer.conditions?.refund_before_departure?.penalty_amount,
                    penaltyCurrency: offer.conditions?.refund_before_departure?.penalty_currency
                },
                changeBeforeDeparture: {
                    allowed: offer.conditions?.change_before_departure?.allowed || false,
                    penaltyAmount: offer.conditions?.change_before_departure?.penalty_amount,
                    penaltyCurrency: offer.conditions?.change_before_departure?.penalty_currency
                }
            },

            paymentRequirements: {
                requiresInstantPayment: offer.payment_requirements?.requires_instant_payment,
                priceGuaranteeExpiresAt: offer.payment_requirements?.price_guarantee_expires_at,
                paymentRequiredBy: offer.payment_requirements?.payment_required_by
            }
        };
    }

    @Tool({
        name: 'search_airports',
        description: 'Search for airports by city name or airport code. Useful for finding IATA codes.',
        inputSchema: z.object({
            query: z.string().min(2).describe('City name or airport code to search for')
        }),
        examples: {
            request: {
                query: 'London'
            },
            response: {
                query: 'London',
                results: [
                    {
                        id: 'arp_lhr_gb',
                        name: 'Heathrow Airport',
                        iataCode: 'LHR',
                        icaoCode: 'EGLL',
                        cityName: 'London',
                        type: 'airport',
                        latitude: 51.4700,
                        longitude: -0.4543,
                        timeZone: 'Europe/London'
                    },
                    {
                        id: 'arp_lgw_gb',
                        name: 'Gatwick Airport',
                        iataCode: 'LGW',
                        icaoCode: 'EGKK',
                        cityName: 'London',
                        type: 'airport',
                        latitude: 51.1537,
                        longitude: -0.1821,
                        timeZone: 'Europe/London'
                    },
                    {
                        id: 'arp_stn_gb',
                        name: 'Stansted Airport',
                        iataCode: 'STN',
                        icaoCode: 'EGSS',
                        cityName: 'London',
                        type: 'airport',
                        latitude: 51.8860,
                        longitude: 0.2389,
                        timeZone: 'Europe/London'
                    }
                ]
            }
        }
    })
    @UseGuards(OAuthGuard)
    @Widget('airport-search')
    async searchAirports(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Searching airports', {
            user: ctx.auth?.subject,
            query: input.query
        });

        const places = await this.duffelService.searchAirports(input.query);

        return {
            query: input.query,
            results: places.slice(0, 10).map((place: any) => ({
                id: place.id,
                name: place.name,
                iataCode: place.iata_code,
                icaoCode: place.icao_code,
                cityName: place.city_name,
                type: place.type,
                latitude: place.latitude,
                longitude: place.longitude,
                timeZone: place.time_zone
            }))
        };
    }
}
