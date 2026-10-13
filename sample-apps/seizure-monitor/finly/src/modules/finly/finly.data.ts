/**
 * Curated glossary, kept in step with mcp/tools/learning_tool.py.
 *
 * Hand-written rather than model-generated. These are the definitions the whole
 * product leans on, so they must be correct, plain, and identical every time.
 *
 * House style:
 *   - No term is explained using another unexplained term.
 *   - Say what it costs the user, not only what it is.
 *   - Short sentences. A first-time earner is the reader.
 */

export interface Term {
    word: string;
    plain: string;
    watchOut: string;
    aliases?: string[];
}

export const GLOSSARY: Term[] = [
    {
        word: 'Emergency fund',
        plain:
            'Money kept aside only for a bad month — lost work, an illness, a vehicle ' +
            'repair. It sits somewhere you can reach the same day.',
        watchOut:
            'If your income changes month to month, aim higher than the usual advice. ' +
            'Three months of costs is a floor, not a target.',
        aliases: ['emergency savings', 'rainy day fund'],
    },
    {
        word: 'Premium',
        plain: 'The amount you pay, usually every year, to keep an insurance policy running.',
        watchOut:
            'Ask what happens if you cannot pay it one year. With many policies you lose ' +
            'most of what you have already put in.',
    },
    {
        word: 'Term insurance',
        plain:
            'Pure life cover. You pay a small amount each year, and if you die during the ' +
            'covered years your family receives a large sum. If you live, you get nothing ' +
            'back — that is the trade for the low price.',
        watchOut:
            'It is usually far cheaper than policies mixing cover with saving. Cheap is not ' +
            'the same as bad here.',
    },
    {
        word: 'Endowment policy',
        plain:
            'An insurance policy that also tries to save for you. You pay much more than ' +
            'for pure life cover and receive a lump sum at the end.',
        watchOut:
            'The return is often low once rising prices are accounted for, and stopping ' +
            'early can mean losing most of what you paid.',
    },
    {
        word: 'Compounding',
        plain:
            'Growth on top of growth. Money you earned last year earns again this year, so ' +
            'the total rises faster the longer you leave it.',
        watchOut: 'It works the same way against you on a loan you do not clear.',
    },
    {
        word: 'Inflation',
        plain:
            'Prices rising over time, so the same money buys less later. Rs 100 today does ' +
            'not buy Rs 100 of goods in ten years.',
        watchOut:
            'A plan that ignores inflation looks better than it is. Always ask what a future ' +
            'amount is worth in today\'s money.',
    },
    {
        word: 'EMI',
        plain:
            'A fixed amount you pay every month until a loan is cleared. It covers part of ' +
            'what you borrowed plus the interest.',
        watchOut:
            'The payment does not shrink in a bad month. Check it against your weakest ' +
            'month, not your best one.',
        aliases: ['equated monthly instalment', 'instalment', 'installment'],
    },
    {
        word: 'Credit score',
        plain:
            'A number lenders use to judge how reliably you repay, built from your history ' +
            'of paying on time.',
        watchOut:
            'Having no history is not the same as having a good one. Many people are refused ' +
            'simply because there is nothing on record.',
    },
    {
        word: 'Surrender value',
        plain: 'What an insurance company pays you if you stop a policy before it finishes.',
        watchOut:
            'In the early years this is often far less than you paid in, and can be nothing ' +
            'at all. Ask for the figure in writing before signing.',
    },
    {
        word: 'Commission',
        plain:
            'Money the person selling you a financial product earns for selling it. It is ' +
            'paid out of what you pay.',
        watchOut:
            'Products that pay more commission get recommended more often. It is fair to ask ' +
            'what the seller earns.',
    },
    {
        word: 'Nominee',
        plain: 'The person you name to receive money from an account or policy if you die.',
        watchOut:
            'An out-of-date nominee causes long delays for families. Check it after a ' +
            'marriage or a birth.',
    },
    {
        word: 'Lock-in period',
        plain:
            'A stretch of time during which you cannot take your money out, or can only take ' +
            'it out at a loss.',
        watchOut:
            'Ask how long it lasts before you put money in, not after. This is where people ' +
            'with variable income get caught.',
    },
    {
        word: 'Processing fee',
        plain: 'A one-off charge a lender takes for arranging a loan.',
        watchOut:
            'It is usually outside the advertised interest rate, so two loans at the same ' +
            'rate can cost different amounts.',
    },
];

export function findTerm(query: string): Term | undefined {
    const q = query.trim().toLowerCase();
    return (
        GLOSSARY.find((t) => t.word.toLowerCase() === q) ??
        GLOSSARY.find((t) => t.aliases?.some((a) => a.toLowerCase() === q)) ??
        GLOSSARY.find((t) => t.word.toLowerCase().includes(q) || q.includes(t.word.toLowerCase()))
    );
}

/**
 * Questions worth asking before signing anything, kept in step with
 * transparency_tool.py.
 *
 * Note what is absent: any claim about what commission a specific product pays.
 * That needs a verified IRDAI/SEBI/AMFI dataset which does not exist yet, and a
 * fabricated commission figure would look entirely plausible while being wrong.
 */
export const BEFORE_YOU_SIGN = [
    'Ask for the total payable in rupees, not the monthly or yearly figure.',
    'Ask for every charge as a rupee amount for year one and for the full term.',
    'Ask what you would receive if you stopped in year 1, year 3 and year 5. This is where most money is lost.',
    'Ask when you can take the money out without a penalty.',
    'Ask directly what commission is paid on this product. You are entitled to ask, and the answer explains a lot.',
    'Ask what happens if you cannot pay one year.',
    'Ask for the full document to take away. Nothing legitimate requires signing the same day.',
];
