import { Duffel } from '@duffel/api';
import { Injectable } from '@nitrostack/core';

/**
 * Duffel API Service
 * 
 * Handles all interactions with the Duffel API for flight search and booking.
 * Implements best practices from Duffel documentation.
 */
@Injectable()
export class DuffelService {
    private duffel: Duffel;

    constructor() {
        const apiKey = process.env.DUFFEL_API_KEY;
        if (!apiKey) {
            throw new Error('DUFFEL_API_KEY environment variable is required');
        }

        this.duffel = new Duffel({
            token: apiKey
        });
    }

    /**
     * Search for flights using offer requests
     * 
     * @param params Search parameters
     * @returns Flight offers
     */
    async searchFlights(params: {
        origin: string;
        destination: string;
        departureDate: string;
        returnDate?: string;
        passengers: Array<{ type: 'adult' } | { type: 'child'; age: number } | { type: 'infant_without_seat' }>;
        cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
        maxConnections?: number;
        departureTime?: { from: string; to: string };
        arrivalTime?: { from: string; to: string };
    }) {
        try {
            const slices: any[] = [
                {
                    origin: params.origin,
                    destination: params.destination,
                    departure_date: params.departureDate,
                    ...(params.departureTime && { departure_time: params.departureTime }),
                    ...(params.arrivalTime && { arrival_time: params.arrivalTime })
                }
            ];

            // Add return slice if round trip
            if (params.returnDate) {
                slices.push({
                    origin: params.destination,
                    destination: params.origin,
                    departure_date: params.returnDate
                });
            }

            const offerRequest = await this.duffel.offerRequests.create({
                slices,
                passengers: params.passengers as any,
                cabin_class: params.cabinClass,
                max_connections: params.maxConnections as 0 | 1 | 2 | undefined,
                return_offers: true
            });

            return {
                id: offerRequest.data.id,
                offers: offerRequest.data.offers || [],
                passengers: offerRequest.data.passengers,
                slices: offerRequest.data.slices
            };
        } catch (error: any) {
            throw new Error(`Flight search failed: ${error.message || JSON.stringify(error.errors || error)}`);
        }
    }

    /**
     * Get a specific offer by ID
     */
    async getOffer(offerId: string) {
        try {
            const offer = await this.duffel.offers.get(offerId);
            return offer.data;
        } catch (error: any) {
            throw new Error(`Failed to get offer: ${error.message}`);
        }
    }

    /**
     * Get available seats for an offer
     */
    async getAvailableSeats(offerId: string) {
        try {
            const seatMaps = await this.duffel.seatMaps.get({ offer_id: offerId });
            return seatMaps.data;
        } catch (error: any) {
            throw new Error(`Failed to get seat maps: ${error.message}`);
        }
    }


    /**
     * Generate a simple UUID-like identifier
     */
    private generateId(): string {
        return 'pas_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create an order (book a flight) with optional hold
     * This creates a new offer request with passenger details to get passenger IDs,
     * then uses those IDs to create the order
     */
    async createOrder(params: {
        selectedOffers: string[];
        passengers: Array<{
            title: 'mr' | 'ms' | 'mrs' | 'miss' | 'dr';
            given_name: string;
            family_name: string;
            gender: 'M' | 'F';
            born_on: string;
            email: string;
            phone_number: string;
        }>;
    }) {
        try {
            // Step 1: Get the offer to extract flight details
            const offer = await this.duffel.offers.get(params.selectedOffers[0]);
            const offerData = offer.data;

            // Step 2: Create a new offer request with passenger details to get passenger IDs
            const offerRequest = await this.duffel.offerRequests.create({
                slices: offerData.slices.map((slice: any) => ({
                    origin: slice.origin.iata_code,
                    destination: slice.destination.iata_code,
                    departure_date: slice.segments[0].departing_at.split('T')[0]
                })),
                passengers: params.passengers.map(p => ({
                    type: 'adult', // Simplified - you can enhance this based on age
                    given_name: p.given_name,
                    family_name: p.family_name,
                    title: p.title,
                    gender: p.gender.toLowerCase() as 'm' | 'f',
                    born_on: p.born_on,
                    email: p.email,
                    phone_number: p.phone_number
                })),
                cabin_class: (offerData as any).cabin_class || 'economy',
                return_offers: true  // We need offers to be returned!
            } as any);

            const passengerIds = offerRequest.data.passengers.map((p: any) => p.id);

            // Step 3: Create order using passenger IDs from the NEW offer request
            // We need to use an offer from THIS offer request, not the original one
            const newOfferId = (offerRequest.data as any).offers?.[0]?.id;

            if (!newOfferId) {
                throw new Error('No offers returned from offer request with passenger details');
            }

            const orderData: any = {
                selected_offers: [newOfferId],  // Use offer from the NEW request
                passengers: passengerIds.map((id: string, index: number) => ({
                    id: id,
                    ...params.passengers[index],
                    gender: params.passengers[index].gender.toLowerCase()
                })),
                type: 'hold'  // Always create hold orders
            };

            const order = await this.duffel.orders.create(orderData);
            return order.data;
        } catch (error: any) {
            // Log detailed error information
            const errorDetails = {
                message: error.message,
                errors: error.errors,
                response: error.response?.data,
                status: error.response?.status
            };
            console.error('Duffel order creation failed:', JSON.stringify(errorDetails, null, 2));

            throw new Error(`Failed to create order: ${error.message || JSON.stringify(error.errors || error.response?.data || error)}`);
        }
    }



    /**
     * Get available seats for an offer
     */
    async getSeatsForOffer(offerId: string) {
        try {
            const seatMaps = await this.duffel.seatMaps.get({ offer_id: offerId });
            return seatMaps.data;
        } catch (error: any) {
            throw new Error(`Failed to get seats: ${error.message || JSON.stringify(error.errors || error)}`);
        }
    }

    /**
     * Create order change request for seats
     */
    async createOrderChangeForSeats(orderId: string) {
        try {
            const changeRequest = await this.duffel.orderChangeRequests.create({
                order_id: orderId
            } as any);
            return changeRequest.data;
        } catch (error: any) {
            throw new Error(`Failed to create order change: ${error.message || JSON.stringify(error.errors || error)}`);
        }
    }

    /**
     * Get available services (baggage, seats) for an order
     */
    async getAvailableServices(orderId: string) {
        try {
            const services = await this.duffel.orderChangeRequests.create({
                order_id: orderId
            } as any);
            return services.data;
        } catch (error: any) {
            throw new Error(`Failed to get available services: ${error.message || JSON.stringify(error.errors || error)}`);
        }
    }

    /**
     * Get order details
     */
    async getOrder(orderId: string) {
        try {
            const order = await this.duffel.orders.get(orderId);
            return order.data;
        } catch (error: any) {
            throw new Error(`Failed to get order: ${error.message}`);
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string) {
        try {
            const cancellation = await this.duffel.orderCancellations.create({
                order_id: orderId
            });
            return cancellation.data;
        } catch (error: any) {
            throw new Error(`Failed to cancel order: ${error.message}`);
        }
    }

    /**
     * Search for airports by query
     */
    async searchAirports(query: string) {
        try {
            const suggestions = await this.duffel.suggestions.list({
                query: query
            });
            return suggestions.data;
        } catch (error: any) {
            throw new Error(`Failed to search airports: ${error.message}`);
        }
    }

    /**
     * Get airlines list
     */
    async getAirlines() {
        try {
            const airlines = await this.duffel.airlines.list();
            return airlines.data;
        } catch (error: any) {
            throw new Error(`Failed to get airlines: ${error.message}`);
        }
    }
}
