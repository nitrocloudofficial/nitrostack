import { Module } from '@nestjs/common';
import { FactoryGateway } from './factory.gateway.js';

@Module({ providers: [FactoryGateway] })
export class FactoryGatewayModule {}
