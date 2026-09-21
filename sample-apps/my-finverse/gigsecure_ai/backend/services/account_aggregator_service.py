import random

class AccountAggregatorService:
    @staticmethod
    def discover_all_assets(aadhaar_number: str, phone: str = "") -> dict:
        """
        Simulates RBI Account Aggregator (AA) protocol searching financial entities across India
        by verified Aadhaar & OTP consent token.
        """
        clean_aadhaar = aadhaar_number.replace("-", "").strip()

        # Deterministic synthetic asset inventory seed
        seed_val = int(clean_aadhaar[-6:]) if len(clean_aadhaar) >= 6 else 123456
        random.seed(seed_val)

        savings_balance = round(random.uniform(15000, 85000), 2)
        fd_balance = round(random.uniform(50000, 250000), 2)
        lic_sum_assured = round(random.uniform(200000, 1000000), 2)
        epfo_balance = round(random.uniform(80000, 450000), 2)
        mf_nav_value = round(random.uniform(35000, 180000), 2)
        wallet_balance = round(random.uniform(1500, 12000), 2)
        sgb_value = round(random.uniform(25000, 95000), 2)

        total_val = savings_balance + fd_balance + lic_sum_assured + epfo_balance + mf_nav_value + wallet_balance + sgb_value

        assets = [
          {
            "category": "Savings & Current Accounts",
            "institution": "State Bank of India",
            "account_number": f"****{random.randint(1000, 9999)}",
            "balance": savings_balance,
            "nominee_declared": "YES",
            "nominee_name": "Sunita Verma"
          },
          {
            "category": "Fixed Deposits (FD)",
            "institution": "HDFC Bank Ltd",
            "account_number": f"FD-{random.randint(100000, 999999)}",
            "balance": fd_balance,
            "nominee_declared": "YES",
            "nominee_name": "Sunita Verma"
          },
          {
            "category": "Life Insurance Policy",
            "institution": "LIC of India (Jeevan Anand)",
            "account_number": f"POL-{random.randint(1000000, 9999999)}",
            "balance": lic_sum_assured,
            "nominee_declared": "YES",
            "nominee_name": "Sunita Verma"
          },
          {
            "category": "Employees' Provident Fund (EPFO)",
            "institution": "EPFO Ministry of Labour",
            "account_number": f"UAN-{random.randint(1000000000, 9999999999)}",
            "balance": epfo_balance,
            "nominee_declared": "YES",
            "nominee_name": "Sunita Verma"
          },
          {
            "category": "Mutual Funds (AMFI Folio)",
            "institution": "Nippon India Small Cap Fund",
            "account_number": f"FOLIO-{random.randint(10000, 99999)}",
            "balance": mf_nav_value,
            "nominee_declared": "YES",
            "nominee_name": "Sunita Verma"
          },
          {
            "category": "Digital Wallet",
            "institution": "Paytm / PhonePe Wallet Reserve",
            "account_number": f"WLT-{clean_aadhaar[-4:]}",
            "balance": wallet_balance,
            "nominee_declared": "NO",
            "nominee_name": "Unclaimed"
          },
          {
            "category": "Sovereign Gold Bonds (SGB)",
            "institution": "RBI Sovereign Gold Bond 2024 Series",
            "account_number": f"SGB-{random.randint(10000, 99999)}",
            "balance": sgb_value,
            "nominee_declared": "YES",
            "nominee_name": "Sunita Verma"
          }
        ]

        return {
            "aadhaar_number": clean_aadhaar,
            "total_aggregated_value": round(total_val, 2),
            "asset_count": len(assets),
            "account_aggregator_status": "AA_DISCOVERY_COMPLETED",
            "assets": assets
        }
