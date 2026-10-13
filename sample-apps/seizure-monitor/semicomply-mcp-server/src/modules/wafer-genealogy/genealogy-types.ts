export interface GenealogyEvent {
    timestamp: string;
    source: string;
    processStep: string;
    details: Record<string, unknown>;
}

export interface GenealogyContributor {
    readonly sourceName: string;
    fetchEvents(batchId: string): Promise<GenealogyEvent[]>;
}

export interface ProductInfo {
    productId: string;
    lotId: string;
    datasheetUrl: string;
    operatingVoltage: string;
    maxThermalThreshold: string;
    complianceCertifications: string[];
}

export interface LifecycleStep {
    timestamp: string;
    label: string;
    description: string;
    meta: Record<string, string>;
}

export interface LifecyclePhase {
    id: string;
    name: string;
    color: string;
    steps: LifecycleStep[];
}

export interface RouteStop {
    leg: number;
    origin: string;
    destination: string;
    eccnClassification: string;
    hsCode: string;
    applicableTariffs: string;
    status: string;
    isBlocked: boolean;
}

export interface LifecycleTimeline {
    batchId: string;
    product: ProductInfo | null;
    phases: LifecyclePhase[];
    route: RouteStop[];
    summary: string;
}

export interface GenealogyResult {
    batchId: string;
    totalEvents: number;
    timeline: GenealogyEvent[];
    summary: string;
    route?: RouteStop[];
    phases?: LifecyclePhase[];
    widget?: {
        batchId: string;
        product: ProductInfo | null;
        phases: LifecyclePhase[];
        route: RouteStop[];
    };
}
