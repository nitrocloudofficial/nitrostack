import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaxService } from '../dist/modules/tax/tax.service.js';
import { CouncilService } from '../dist/modules/council/council.service.js';

const council = new CouncilService(new TaxService());
const input = { income: 1800000, surplus: 200000, hasLoan: true, loanRate: 9, loanOutstanding: 1500000, emergencyFundMonths: 2, section80CUsed: 0 };

test('convene_council is deterministic (byte-identical on re-run)', () => {
    const a = JSON.stringify(council.convene(input));
    const b = JSON.stringify(council.convene(input));
    assert.equal(a, b);
});

test('convene_council returns exactly 3 agents and a reconciled winner', () => {
    const s = council.convene(input);
    assert.equal(s.agents.length, 3);
    assert.ok(s.finalRecommendation, 'a winner is chosen');
    assert.match(s.agreementLevel, /of 3 agents agree/);
    assert.ok(s.disclaimer.length > 0, 'carries an advice disclaimer');
});

test('convene_council survives garbage input without crashing', () => {
    const s = council.convene({ income: 'oops', surplus: -5, hasLoan: 'yes' });
    assert.ok(s.finalRecommendation);
});
