import type { Ticket } from '../../schemas/ticket.schema.js';

/** In-memory mock tickets for local Agent 1 tool testing. */
export const MOCK_TICKETS: Ticket[] = [
  {
    ticket_id: '11111111-1111-4111-a111-111111111111',
    created_at: '2026-07-25T09:15:00+05:30',
    status: 'submitted',
    victim: {
      full_name: 'Priya Sharma',
      contact_number: '+91-9876543210',
      email: 'priya.sharma@example.com',
      address: '42 MG Road, Bengaluru, Karnataka 560001',
      id_proof_type: 'aadhaar',
      id_proof_number: 'enc:aadhaar:XXXX-XXXX-4321',
    },
    fraud: {
      timestamp: '2026-07-24T18:45:00+05:30',
      medium: 'upi',
      subject: 'Fake customer support UPI refund scam',
      description:
        'Received a call from someone claiming to be bank support. They asked me to approve a UPI collect request for "verification" and ₹48,500 was debited instantly to fraudster@paytm.',
      amount: 48500,
      currency: 'INR',
    },
    fraudster: {
      name: 'Unknown (caller ID spoofed)',
      phone: '+91-9123456789',
      upi_id: 'fraudster@paytm',
    },
    region: {
      country: 'IN',
      state: 'Karnataka',
      jurisdiction_code: 'IN-KA',
    },
    attachments: [
      {
        file_id: 'aaaaaaa1-aaaa-4aaa-aaaa-aaaaaaaaaaa1',
        type: 'image/png',
        storage_url: 'https://storage.example.local/tickets/11111111/screenshot-upi.png',
        uploaded_at: '2026-07-25T09:14:00+05:30',
      },
    ],
    metadata: {
      source: 'web',
      ip_hash: 'sha256:mock-ip-hash-priya-sharma',
    },
  },
  {
    ticket_id: '22222222-2222-4222-a222-222222222222',
    created_at: '2026-07-23T11:20:00+05:30',
    status: 'triaged',
    victim: {
      full_name: 'Rahul Mehta',
      contact_number: '+91-9988776655',
      address: '18 Park Street, Mumbai, Maharashtra 400001',
      id_proof_type: 'pan',
      id_proof_number: 'enc:pan:ABCDE1234F',
    },
    fraud: {
      timestamp: '2026-07-22T20:10:00+05:30',
      medium: 'upi',
      subject: 'UPI collect request under pretext of KYC update',
      description:
        'Fraudster impersonated payment app support and sent a collect request. ₹32,000 transferred to fraudster@paytm.',
      amount: 32000,
      currency: 'INR',
    },
    fraudster: {
      phone: '+91-9123456789',
      upi_id: 'fraudster@paytm',
    },
    region: {
      country: 'IN',
      state: 'Maharashtra',
      jurisdiction_code: 'IN-MH',
    },
    attachments: [],
    metadata: {
      source: 'mobile',
      ip_hash: 'sha256:mock-ip-hash-rahul-mehta',
    },
  },
  {
    ticket_id: '33333333-3333-4333-a333-333333333333',
    created_at: '2026-07-20T16:05:00+05:30',
    status: 'assigned',
    victim: {
      full_name: 'Anita Desai',
      contact_number: '+91-9012345678',
      email: 'anita.desai@example.com',
      address: '7 FC Road, Pune, Maharashtra 411004',
      id_proof_type: 'aadhaar',
      id_proof_number: 'enc:aadhaar:XXXX-XXXX-8765',
    },
    fraud: {
      timestamp: '2026-07-19T13:30:00+05:30',
      medium: 'upi',
      subject: 'QR code scan at fake merchant stall',
      description:
        'Scanned a QR at a pop-up stall; payment went to fraudster@paytm instead of the listed merchant. Amount ₹15,750.',
      amount: 15750,
      currency: 'INR',
    },
    fraudster: {
      upi_id: 'fraudster@paytm',
      address: 'Unknown — temporary stall, Camp area',
    },
    region: {
      country: 'IN',
      state: 'Maharashtra',
      jurisdiction_code: 'IN-MH',
    },
    attachments: [
      {
        file_id: 'aaaaaaa2-aaaa-4aaa-aaaa-aaaaaaaaaaa2',
        type: 'image/jpeg',
        storage_url: 'https://storage.example.local/tickets/33333333/qr-receipt.jpg',
        uploaded_at: '2026-07-20T16:04:00+05:30',
      },
    ],
    metadata: {
      source: 'agent_assisted',
      ip_hash: 'sha256:mock-ip-hash-anita-desai',
    },
  },
  {
    ticket_id: '44444444-4444-4444-a444-444444444444',
    created_at: '2026-07-18T08:40:00+05:30',
    status: 'in_review',
    victim: {
      full_name: 'Vikram Singh',
      contact_number: '+91-8877665544',
      address: '22 Mall Road, Jaipur, Rajasthan 302001',
      id_proof_type: 'aadhaar',
      id_proof_number: 'enc:aadhaar:XXXX-XXXX-1122',
    },
    fraud: {
      timestamp: '2026-07-17T10:00:00+05:30',
      medium: 'bank_transfer',
      subject: 'Investment scheme bank transfer',
      description:
        'Transferred ₹2,00,000 to account 98765432109876 (IFSC HDFC0001234) for a fake fixed-deposit scheme. Unrelated UPI pattern.',
      amount: 200000,
      currency: 'INR',
    },
    fraudster: {
      name: 'Raj Investments (fake)',
      bank_account: '98765432109876',
      ifsc: 'HDFC0001234',
    },
    region: {
      country: 'IN',
      state: 'Rajasthan',
      jurisdiction_code: 'IN-RJ',
    },
    attachments: [],
    metadata: {
      source: 'web',
      ip_hash: 'sha256:mock-ip-hash-vikram-singh',
    },
  },
];

export const DEFAULT_TICKET_ID = MOCK_TICKETS[0].ticket_id;

export const SHARED_FRAUDSTER_UPI_ID = 'fraudster@paytm';
