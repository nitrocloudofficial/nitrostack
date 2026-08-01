import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaxService } from '../dist/modules/tax/tax.service.js';

const tax = new TaxService();

test('₹18L salaried: 80C is capped at ₹1.5L and the new regime is cheaper', () => {
    const r = tax.calculate({ grossIncome: 1800000, isSalaried: true, deductions: { section80C: 200000, section80D: 25000 } });
    assert.equal(r.old.appliedDeductions.section80C, 150000, '₹2L 80C should cap to ₹1.5L');
    assert.equal(r.recommendation.regime, 'new');
    assert.equal(r.new.totalTax, 150800);
    assert.equal(r.old.totalTax, 296400);
});

test('₹12L salaried under the new regime: Section 87A full rebate → ₹0 tax', () => {
    const r = tax.calculate({ grossIncome: 1200000, isSalaried: true });
    assert.equal(r.new.totalTax, 0);
});

test('garbage / string / negative income does not crash or produce NaN', () => {
    assert.equal(Number.isFinite(tax.calculate({ grossIncome: 'abc' }).new.totalTax), true);
    assert.equal(Number.isFinite(tax.calculate({ grossIncome: '₹30,00,000' }).old.totalTax), true);
    assert.equal(tax.calculate({ grossIncome: -5 }).old.totalTax, 0);
});
