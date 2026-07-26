from datetime import datetime, timedelta

class DeathRegistryService:
    @staticmethod
    def query_civil_registry(aadhaar_number: str) -> dict:
        clean_aadhaar = aadhaar_number.replace("-", "").strip()

        # Simulated civil registry lookup
        if clean_aadhaar.endswith("00") or clean_aadhaar.endswith("99"):
            return {
                "status": "Deceased",
                "is_deceased": True,
                "aadhaar_number": clean_aadhaar,
                "deceased_name": "Rajesh Kumar Verma",
                "death_date": (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d"),
                "certificate_number": f"CRS-DEATH-2026-{clean_aadhaar[-4:]}",
                "authority": "Municipal Corporation Death & Birth Registry",
                "place_of_death": "District Government Hospital, Mumbai",
                "message": "Civil Death Registry record verified on State CRS Portal."
            }

        return {
            "status": "Alive",
            "is_deceased": False,
            "aadhaar_number": clean_aadhaar,
            "deceased_name": "N/A",
            "death_date": "N/A",
            "certificate_number": "N/A",
            "authority": "N/A",
            "place_of_death": "N/A",
            "message": "Individual registered active & alive in Civil Registry."
        }
