import { ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards, Injectable } from '@nitrostack/core';
import { OAuthGuard } from '../../guards/oauth.guard.js';
import { DuffelService } from '../../services/duffel.service.js';

// Note: Using explicit deps for ESM compatibility
@Injectable({ deps: [DuffelService] })
export class BookingTools {
    constructor(private duffelService: DuffelService) { }

    @Tool({
        name: 'create_order',
        description: 'Create a flight order with hold (no payment required). IMPORTANT: Before calling this tool, you MUST collect passenger information from the user. Ask for: full name (first and last), title (Mr/Ms/Mrs/Miss/Dr), gender (M/F), date of birth (YYYY-MM-DD), email, and phone number with country code. The order will be held for later payment.',
        inputSchema: z.object({
            offerId: z.string().describe('The offer ID to book'),
            passengers: z.string().describe('JSON string containing array of passenger objects. Each passenger must have: title (mr/ms/mrs/miss/dr), givenName (first name), familyName (last name), gender (M/F), bornOn (YYYY-MM-DD), email, phoneNumber. Example: \'[{"title":"mr","givenName":"John","familyName":"Doe","gender":"M","bornOn":"1990-01-15","email":"john@example.com","phoneNumber":"+1234567890"}]\'')
        }),
        examples: {
            request: {
                offerId: 'off_123456',
                passengers: '[{"title":"mr","givenName":"John","familyName":"Doe","gender":"M","bornOn":"1990-01-15","email":"john.doe@example.com","phoneNumber":"+1234567890"}]'
            },
            response: {
                orderId: 'ord_123456',
                status: 'held',
                totalAmount: '450.00',
                totalCurrency: 'USD',
                expiresAt: '2024-03-01T12:00:00Z',
                passengers: [],
                slices: [],
                message: 'Order created and held successfully.'
            }
        }
    })
    @UseGuards(OAuthGuard)
    @Widget('order-summary')
    async createOrder(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Creating flight order (hold)', {
            user: ctx.auth?.subject,
            offerId: input.offerId
        });

        // Validate and parse passengers
        let passengersArray;
        try {
            if (typeof input.passengers === 'string') {
                // Try to parse the JSON string
                // Handle both regular JSON and double-encoded JSON
                let passengerStr = input.passengers;

                // If the string starts with escaped quotes, it might be double-encoded
                if (passengerStr.startsWith('\\"') || passengerStr.includes('\\"')) {
                    // Remove escape characters
                    passengerStr = passengerStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                }

                passengersArray = JSON.parse(passengerStr);
            } else if (Array.isArray(input.passengers)) {
                passengersArray = input.passengers;
            } else {
                throw new Error('Passengers must be a JSON string or array');
            }
        } catch (error: any) {
            ctx.logger.error('Failed to parse passengers', {
                input: input.passengers,
                error: error.message
            });
            throw new Error(`Invalid passengers format: ${error.message}. Expected JSON string like '[{"title":"mr","givenName":"John","familyName":"Doe","gender":"M","bornOn":"1990-01-15","email":"john@example.com","phoneNumber":"+1234567890"}]'`);
        }

        if (!passengersArray || !Array.isArray(passengersArray) || passengersArray.length === 0) {
            throw new Error('At least one passenger is required to create an order');
        }

        // Transform passengers to Duffel format
        // Pass inline passenger data - Duffel will create passenger records automatically
        const passengers = passengersArray.map((pax: any) => ({
            title: pax.title,
            given_name: pax.givenName,
            family_name: pax.familyName,
            gender: pax.gender,
            born_on: pax.bornOn,
            email: pax.email,
            phone_number: pax.phoneNumber
        }));

        const orderParams: any = {
            selectedOffers: [input.offerId],
            passengers,
            type: 'hold' // Always create hold orders
        };

        const order = await this.duffelService.createOrder(orderParams);

        ctx.logger.info('Order created successfully', {
            user: ctx.auth?.subject,
            orderId: order.id,
            status: 'held'
        });

        return {
            orderId: order.id,
            status: 'held',
            totalAmount: order.total_amount,
            totalCurrency: order.total_currency,
            expiresAt: (order as any).expires_at,
            bookingReference: order.booking_reference,
            passengers: order.passengers.map((pax: any) => ({
                id: pax.id,
                name: `${pax.given_name} ${pax.family_name}`,
                type: pax.type
            })),
            slices: order.slices.map((slice: any) => ({
                origin: slice.origin.iata_code,
                destination: slice.destination.iata_code,
                departureTime: slice.segments[0].departing_at,
                arrivalTime: slice.segments[slice.segments.length - 1].arriving_at
            })),
            message: 'Order created and held successfully.'
        };
    }



    @Tool({
        name: 'get_order_details',
        description: 'Get detailed information about an order',
        inputSchema: z.object({
            orderId: z.string().describe('The order ID')
        }),
        examples: {
            request: {
                orderId: 'ord_123456'
            },
            response: {
                orderId: 'ord_123456',
                status: 'confirmed',
                bookingReference: 'ABC123',
                totalAmount: '450.00',
                totalCurrency: 'USD',
                passengers: [],
                slices: []
            }
        }
    })
    @UseGuards(OAuthGuard)
    @Widget('order-summary')
    async getOrderDetails(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Getting order details', {
            user: ctx.auth?.subject,
            orderId: input.orderId
        });

        const order = await this.duffelService.getOrder(input.orderId);

        return {
            orderId: order.id,
            status: (order as any).status || 'confirmed',
            bookingReference: order.booking_reference,
            totalAmount: order.total_amount,
            totalCurrency: order.total_currency,
            createdAt: order.created_at,
            expiresAt: (order as any).expires_at,
            passengers: order.passengers.map((pax: any) => ({
                id: pax.id,
                name: `${pax.given_name} ${pax.family_name}`,
                type: pax.type,
                email: pax.email,
                phoneNumber: pax.phone_number
            })),
            slices: order.slices.map((slice: any) => ({
                id: slice.id,
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
                    airline: seg.marketing_carrier.name,
                    flightNumber: seg.marketing_carrier_flight_number,
                    aircraft: seg.aircraft?.name
                }))
            }))
        };
    }

    @Tool({
        name: 'get_seat_map',
        description: 'Get available seats for a flight offer to allow seat selection',
        inputSchema: z.object({
            offerId: z.string().describe('The offer ID to get seats for')
        }),
        examples: {
            request: {
                offerId: 'off_123456'
            },
            response: {
                offerId: 'off_123456',
                cabins: [
                    {
                        cabinClass: 'economy',
                        rows: [
                            {
                                rowNumber: 10,
                                seats: [
                                    {
                                        id: 'seat_10a',
                                        column: 'A',
                                        available: true,
                                        price: '25.00',
                                        currency: 'USD',
                                        type: 'window'
                                    },
                                    {
                                        id: 'seat_10b',
                                        column: 'B',
                                        available: true,
                                        price: '0',
                                        currency: 'USD',
                                        type: 'middle'
                                    },
                                    {
                                        id: 'seat_10c',
                                        column: 'C',
                                        available: true,
                                        price: '15.00',
                                        currency: 'USD',
                                        type: 'aisle'
                                    }
                                ]
                            }
                        ]
                    }
                ],
                message: 'Select your preferred seats from the available options'
            }
        }
    })
    @UseGuards(OAuthGuard)
    @Widget('seat-selection')
    async getSeatMap(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Getting seat map', {
            user: ctx.auth?.subject,
            offerId: input.offerId
        });

        const seatMaps = await this.duffelService.getSeatsForOffer(input.offerId);

        return {
            offerId: input.offerId,
            cabins: seatMaps.map((cabin: any) => ({
                cabinClass: cabin.cabin_class,
                rows: cabin.rows.map((row: any) => ({
                    rowNumber: row.row_number,
                    seats: row.sections.flatMap((section: any) =>
                        section.elements.filter((el: any) => el.type === 'seat').map((seat: any) => ({
                            id: seat.id,
                            column: seat.designator,
                            available: seat.available_services?.length > 0,
                            price: seat.available_services?.[0]?.total_amount,
                            currency: seat.available_services?.[0]?.total_currency,
                            type: seat.disclosures?.join(', ') || 'standard'
                        }))
                    )
                }))
            })),
            message: 'Select your preferred seats from the available options'
        };
    }

    @Tool({
        name: 'cancel_order',
        description: 'Cancel a flight order and request refund if applicable',
        inputSchema: z.object({
            orderId: z.string().describe('The order ID to cancel')
        }),
        examples: {
            request: {
                orderId: 'ord_123456'
            },
            response: {
                orderId: 'ord_123456',
                cancellationId: 'ocr_123456',
                status: 'cancelled',
                refundAmount: '450.00',
                refundCurrency: 'USD',
                confirmedAt: '2024-03-01T12:00:00Z',
                message: 'Order cancelled. Refund of USD 450.00 will be processed.'
            }
        }
    })
    @UseGuards(OAuthGuard)
    @Widget('order-cancellation')
    async cancelOrder(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Cancelling order', {
            user: ctx.auth?.subject,
            orderId: input.orderId
        });

        const cancellation = await this.duffelService.cancelOrder(input.orderId);

        return {
            orderId: input.orderId,
            cancellationId: cancellation.id,
            status: 'cancelled',
            refundAmount: cancellation.refund_amount,
            refundCurrency: cancellation.refund_currency,
            confirmedAt: cancellation.confirmed_at,
            message: cancellation.refund_amount
                ? `Order cancelled. Refund of ${cancellation.refund_currency} ${cancellation.refund_amount} will be processed.`
                : 'Order cancelled. No refund available for this booking.'
        };
    }
}
