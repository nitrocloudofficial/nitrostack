// Mock Indian SME Business Registry Dataset
// Exposed as a NitroStack Resource: registry://businesses
// Browsable in NitroStudio's Resources page

export interface RegistryRecord {
    registrationNumber: string;
    businessName: string;
    type: string; // 'Pvt Ltd' | 'LLP' | 'Proprietorship' | 'MSME'
    status: 'active' | 'inactive' | 'struck_off' | 'under_review';
    incorporationDate: string;
    registeredAddress: string;
    state: string;
    directorName: string;
    directorDIN: string;
    gstNumber: string | null;
    sector: string;
    authorizedCapital: number; // INR
    paidUpCapital: number; // INR
    lastFilingDate: string;
}

export const REGISTRY_DATASET: RegistryRecord[] = [
    {
        registrationNumber: 'U01111KA2020PTC334455',
        businessName: 'Kaveri AgriTech Pvt Ltd',
        type: 'Pvt Ltd',
        status: 'active',
        incorporationDate: '2020-04-10',
        registeredAddress: '10, Farm Road, Mysuru, Karnataka 570001',
        state: 'Karnataka',
        directorName: 'Suresh Patel',
        directorDIN: '09876123',
        gstNumber: '29AACCK3344F1Z8', // Checksum formula match for valid
        sector: 'Agriculture',
        authorizedCapital: 2000000,
        paidUpCapital: 1000000,
        lastFilingDate: '2023-11-20',
    },
    {
        registrationNumber: 'LLP-MH-9988',
        businessName: 'Nexus Global Trading LLP',
        type: 'LLP',
        status: 'active',
        incorporationDate: '2022-08-15',
        registeredAddress: '99, Marine Drive, Mumbai, Maharashtra 400020',
        state: 'Maharashtra',
        directorName: 'Amit Singh',
        directorDIN: '09998877',
        gstNumber: '27AAACN1234E1Z4',
        sector: 'General Trading',
        authorizedCapital: 500000,
        paidUpCapital: 100000,
        lastFilingDate: '2022-12-01', // Stale filing
    },
    {
        registrationNumber: 'UDYAM-TN-02-9876543',
        businessName: 'Balaji Hardware Store',
        type: 'MSME',
        status: 'active',
        incorporationDate: '2012-05-20',
        registeredAddress: '15, Market Street, Madurai, Tamil Nadu 625001',
        state: 'Tamil Nadu',
        directorName: 'Rajan Kumar',
        directorDIN: '01112222',
        gstNumber: '33AAGPB1111C1Z7',
        sector: 'Retail',
        authorizedCapital: 1500000,
        paidUpCapital: 1500000,
        lastFilingDate: '2023-09-30',
    },
    {
        registrationNumber: 'U63090MH2019PTC567890',
        businessName: 'Vibrant Logistics Pvt Ltd',
        type: 'Pvt Ltd',
        status: 'active',
        incorporationDate: '2019-08-12',
        registeredAddress: 'Andheri East, Mumbai, Maharashtra',
        state: 'Maharashtra',
        directorName: 'Ramesh Patel',
        directorDIN: '01234567',
        gstNumber: '27AADCV1234E1Z2',
        sector: 'Logistics',
        authorizedCapital: 1000000,
        paidUpCapital: 500000,
        lastFilingDate: '2023-10-15',
    },
    {
        registrationNumber: 'U17111KA2018PTC112345',
        businessName: 'Priya Textiles Pvt Ltd',
        type: 'Pvt Ltd',
        status: 'active',
        incorporationDate: '2018-05-10',
        registeredAddress: '42, MG Road, Bengaluru, Karnataka 560001',
        state: 'Karnataka',
        directorName: 'Anil Kumar',
        directorDIN: '02345678',
        gstNumber: '29AACCP1234F1Z9',
        sector: 'Textiles',
        authorizedCapital: 2000000,
        paidUpCapital: 1000000,
        lastFilingDate: '2023-11-01',
    },
    {
        registrationNumber: 'U27100TN2015PTC098765',
        businessName: 'Coimbatore Steels & Alloys Pvt Ltd',
        type: 'Pvt Ltd',
        status: 'active',
        incorporationDate: '2015-06-20',
        registeredAddress: '42, Unknown Street, Chennai, Tamil Nadu 600001',
        state: 'Tamil Nadu',
        directorName: 'Karthik N',
        directorDIN: '03456789',
        gstNumber: '33AACCC9876F1Z5',
        sector: 'Manufacturing',
        authorizedCapital: 5000000,
        paidUpCapital: 2500000,
        lastFilingDate: '2022-05-15',
    },
    {
        registrationNumber: 'UDYAM-TN-06-0012345',
        businessName: 'Apex Micro Enterprises',
        type: 'MSME',
        status: 'active',
        incorporationDate: '2022-01-10',
        registeredAddress: '22, Kamaraj Nagar, Tiruppur, Tamil Nadu 641604',
        state: 'Tamil Nadu',
        directorName: 'Vijay S',
        directorDIN: '04567890',
        gstNumber: '33AAACA1234F1Z1',
        sector: 'Retail',
        authorizedCapital: 500000,
        paidUpCapital: 200000,
        lastFilingDate: '2023-12-01',
    }
];
