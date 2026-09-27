import os

class OCRService:
    @staticmethod
    def extract_text_from_document(file_name: str, file_bytes: bytes = None) -> str:
        """
        Simulates OCR text extraction from Death Certificate or Legal Heir Certificate.
        """
        fn = file_name.lower()
        if "death" in fn or "certificate" in fn:
            return """
            GOVERNMENT OF MAHARASHTRA - MUNICIPAL CORPORATION
            FORM NO. 6 - DEATH CERTIFICATE
            Certificate No: CRS-DEATH-2026-9900
            This is to certify that the following information has been taken from the official register of Deaths.
            Name of Deceased: RAJESH KUMAR VERMA
            Aadhaar No: 9999-8888-9900
            Date of Death: 11-07-2026
            Place of Death: Government District Hospital, Mumbai
            Mother Name: Shanti Devi
            Father/Husband Name: Rameshwar Verma
            Registration No: REG/2026/MUM/8821
            Issuing Authority: Registrar of Births and Deaths, Ward A, Municipal Corp.
            Date of Issue: 14-07-2026
            """
        elif "heir" in fn or "nominee" in fn:
            return """
            REVENUE DEPARTMENT - LEGAL HEIR CERTIFICATE
            Certificate No: LHC-2026-MUM-4412
            Sub-Divisional Magistrate Court, Mumbai Suburban
            Deceased Name: RAJESH KUMAR VERMA
            Date of Demise: 11-07-2026
            Legal Nominee / Beneficiary Details:
            1. Sunita Rajesh Verma (Wife) - Aadhaar: 8888-7777-6666 - Share: 100%
            Verified & Certified by Tehsildar & District Magistrate.
            """

        return f"GENERIC DOCUMENT TEXT READ FROM {file_name}. Verified official seal detected."
