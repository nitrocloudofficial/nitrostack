import { Module } from '@nitrostack/core';
import { ShippingTradeService } from './shipping.service.js';
import { ShippingTradeTools } from './shipping.tools.js';

@Module({
    name: 'shipping',
    description: 'Shipping and trade module',
    controllers: [ShippingTradeTools],
    providers: [ShippingTradeService],
})
export class ShippingTradeModule { }
