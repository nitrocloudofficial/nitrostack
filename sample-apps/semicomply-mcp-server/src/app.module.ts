import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DesignModule } from './modules/design/design.module.js';
import { ManufacturingMESModule } from './modules/manufacturing/manufacturing.module.js';
import { QualityTestModule } from './modules/quality/quality.module.js';
import { ProductDocModule } from './modules/product/product.module.js';
import { ShippingTradeModule } from './modules/shipping/shipping.module.js';
import { RootCauseAnalysisModule } from './modules/root-cause-analysis/root-cause-analysis.module.js';
import { WaferGenealogyModule } from './modules/wafer-genealogy/wafer-genealogy.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { GoogleSheetsService } from './modules/google-sheets/google-sheets.service.js';

/**
 * Root Application Module
 * 
 * Unified Semiconductor Lifecycle MCP Server
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'semiconductor-mcp',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'root',
    description: 'Unified Semiconductor Lifecycle MCP Server',
    imports: [
        ConfigModule.forRoot(),
        DesignModule,
        ManufacturingMESModule,
        QualityTestModule,
        ProductDocModule,
        ShippingTradeModule,
        RootCauseAnalysisModule,
        WaferGenealogyModule,
        NotificationsModule,
    ],
    providers: [GoogleSheetsService],
})
export class AppModule { }
