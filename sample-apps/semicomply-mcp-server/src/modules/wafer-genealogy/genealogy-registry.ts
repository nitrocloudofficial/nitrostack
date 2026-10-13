import { Injectable } from '@nitrostack/core';
import { GenealogyContributor, GenealogyEvent } from './genealogy-types.js';

@Injectable()
export class GenealogyContributorRegistry {
    private contributors: GenealogyContributor[] = [];

    register(contributor: GenealogyContributor): void {
        this.contributors.push(contributor);
    }

    getContributors(): GenealogyContributor[] {
        return [...this.contributors];
    }
}
