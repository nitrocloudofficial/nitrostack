/**
 * Indian tax & filing compliance calendar for AY 2026-27 (income earned in
 * FY 2025-26) plus the forward-looking advance-tax / investment dates for
 * FY 2026-27. Dates are the statutory statutory due dates for individual
 * taxpayers (non-audit) with a few common business dates included.
 *
 * NOTE: Statutory dates are occasionally extended by CBDT circulars. Treat
 * these as the standard due dates; always confirm the latest notification.
 */

export type ComplianceCategory =
    | 'ITR'
    | 'Advance Tax'
    | 'TDS'
    | 'Investment'
    | 'Audit'
    | 'GST';

export interface ComplianceEvent {
    id: string;
    title: string;
    category: ComplianceCategory;
    /** Statutory due date in ISO yyyy-mm-dd. */
    dueDate: string;
    description: string;
    /** Who this deadline typically applies to. */
    appliesTo: string;
}

export const COMPLIANCE_EVENTS: ComplianceEvent[] = [
    {
        id: 'itr-nonaudit-ay2627',
        title: 'File ITR for AY 2026-27 (non-audit individuals)',
        category: 'ITR',
        dueDate: '2026-07-31',
        description: 'Last date to file income tax return for FY 2025-26 for salaried individuals and taxpayers not requiring an audit.',
        appliesTo: 'Salaried / non-audit individuals',
    },
    {
        id: 'advtax-q2-fy2627',
        title: 'Advance Tax — 2nd instalment (45% cumulative)',
        category: 'Advance Tax',
        dueDate: '2026-09-15',
        description: 'Pay up to 45% of estimated advance tax liability for FY 2026-27 (for anyone with tax liability over ₹10,000/year).',
        appliesTo: 'Taxpayers with advance-tax liability',
    },
    {
        id: 'audit-report-ay2627',
        title: 'Tax audit report (Form 3CA/3CB-3CD) for AY 2026-27',
        category: 'Audit',
        dueDate: '2026-09-30',
        description: 'Due date for furnishing the tax audit report for taxpayers subject to audit under section 44AB.',
        appliesTo: 'Businesses/professionals under tax audit',
    },
    {
        id: 'itr-audit-ay2627',
        title: 'File ITR for AY 2026-27 (audit cases)',
        category: 'ITR',
        dueDate: '2026-10-31',
        description: 'Last date to file the income tax return for taxpayers whose accounts require a tax audit.',
        appliesTo: 'Audit cases',
    },
    {
        id: 'advtax-q3-fy2627',
        title: 'Advance Tax — 3rd instalment (75% cumulative)',
        category: 'Advance Tax',
        dueDate: '2026-12-15',
        description: 'Pay up to 75% of estimated advance tax liability for FY 2026-27.',
        appliesTo: 'Taxpayers with advance-tax liability',
    },
    {
        id: 'itr-belated-ay2627',
        title: 'Belated / revised ITR for AY 2026-27',
        category: 'ITR',
        dueDate: '2026-12-31',
        description: 'Final date to file a belated return or revise an already-filed return for FY 2025-26.',
        appliesTo: 'All taxpayers',
    },
    {
        id: 'advtax-q4-fy2627',
        title: 'Advance Tax — 4th instalment (100%)',
        category: 'Advance Tax',
        dueDate: '2027-03-15',
        description: 'Pay 100% of estimated advance tax liability for FY 2026-27.',
        appliesTo: 'Taxpayers with advance-tax liability',
    },
    {
        id: 'tax-saving-fy2627',
        title: '80C / 80D tax-saving investment deadline (FY 2026-27)',
        category: 'Investment',
        dueDate: '2027-03-31',
        description: 'Last day to make tax-saving investments (ELSS, PPF, NPS, insurance) to claim deductions for FY 2026-27 under the old regime.',
        appliesTo: 'Old-regime taxpayers',
    },
];
