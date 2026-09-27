export const MOCK_SUBSCRIPTION_EMAILS = [
    {
        id: 'mail_netflix_renewal',
        from: 'billing@netflix.com',
        subject: 'Your Netflix subscription renews soon',
        receivedAt: '2026-07-16T09:10:00.000Z',
        isBilling: true,
        body: `Netflix
Your monthly subscription will renew on 2026-07-19.
Amount due: INR 649.
Previous amount: INR 499.
You watched Stranger Things and 8 other titles this month.`,
    },
    {
        id: 'mail_spotify_receipt',
        from: 'no-reply@spotify.com',
        subject: 'Spotify Premium receipt',
        receivedAt: '2026-07-15T06:30:00.000Z',
        isBilling: true,
        body: `Spotify Premium
Your monthly plan has been charged.
Amount: INR 119.
Next renewal date: 2026-08-15.
Thanks for listening with Spotify.`,
    },
    {
        id: 'mail_calm_yearly',
        from: 'support@calm.com',
        subject: 'Calm annual subscription renewal notice',
        receivedAt: '2026-07-15T13:45:00.000Z',
        isBilling: true,
        body: `Calm
Your yearly subscription renews on 2026-07-18.
Amount: INR 3999.
Previous amount: INR 2999.
We have not seen meditation session activity in the last 30 days.`,
    },
    {
        id: 'mail_adobe_invoice',
        from: 'message@adobe.com',
        subject: 'Your Adobe Creative Cloud invoice',
        receivedAt: '2026-07-14T18:00:00.000Z',
        isBilling: true,
        body: `Adobe Creative Cloud
Billing cycle: monthly.
Amount due: INR 1675.
Your next renewal date is 2026-08-14.
Recent exports and cloud sync activity were detected this week.`,
    },
    {
        id: 'mail_duolingo_trial',
        from: 'plus@duolingo.com',
        subject: 'Your Super Duolingo trial converts tomorrow',
        receivedAt: '2026-07-16T19:00:00.000Z',
        isBilling: true,
        body: `Super Duolingo
Your monthly subscription starts on 2026-07-18.
Amount: INR 329.
No lessons completed in the last 30 days.`,
    },
    {
        id: 'mail_dropbox_usage',
        from: 'no-reply@dropbox.com',
        subject: 'Your Dropbox files were updated',
        receivedAt: '2026-07-12T10:20:00.000Z',
        isBilling: false,
        body: `Dropbox
You edited 14 files and shared 2 folders this week.
This is a usage notification, not a billing email.`,
    },
];
//# sourceMappingURL=subscriptions.data.js.map