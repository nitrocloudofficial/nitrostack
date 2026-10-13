import { Module } from '@nitrostack/core';
import { WaferGenealogyService } from './wafer-genealogy.service.js';
import { WaferGenealogyTools } from './wafer-genealogy.tools.js';
import { GenealogyContributorRegistry } from './genealogy-registry.js';
import { ManufacturingContributor } from './contributors/manufacturing.contributor.js';
import { QualityContributor } from './contributors/quality.contributor.js';
import { DesignContributor } from './contributors/design.contributor.js';
import { ProductContributor } from './contributors/product.contributor.js';
import { ShippingContributor } from './contributors/shipping.contributor.js';

@Module({
    name: 'wafer-genealogy',
    description: 'Wafer batch genealogy tracing across all manufacturing systems',
    controllers: [WaferGenealogyTools],
    providers: [
        WaferGenealogyService,
        GenealogyContributorRegistry,
        ManufacturingContributor,
        QualityContributor,
        DesignContributor,
        ProductContributor,
        ShippingContributor,
    ],
})
export class WaferGenealogyModule { }
