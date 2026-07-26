import { ResourceDecorator as Resource, Injectable, z } from '@nitrostack/core';
import { REGISTRY_DATASET } from './registry.data.js';

@Injectable()
export class RegistryResources {

    @Resource({
        uri: 'registry://businesses',
        name: 'Indian SME Business Registry',
        description: 'Practice dataset of Indian SME businesses — searchable by name or registration number. Browsable in NitroStudio Resources page.',
        mimeType: 'application/json',
    })
    async getAllBusinesses() {
        return REGISTRY_DATASET;
    }

    @Resource({
        uri: 'registry://businesses/{registrationNumber}',
        name: 'Business Registry Record',
        description: 'Look up a single business by registration number',
        mimeType: 'application/json',
    })
    async getBusinessByRegNumber({ registrationNumber }: { registrationNumber: string }) {
        const record = REGISTRY_DATASET.find(r =>
            r.registrationNumber.toLowerCase() === registrationNumber.toLowerCase()
        );
        if (!record) return { error: `No record found for registration number: ${registrationNumber}` };
        return record;
    }
}
