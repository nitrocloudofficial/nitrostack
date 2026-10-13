"""Nightly reconciliation between AURORA.INVOICE and the general ledger extract."""
import pandas as pd
from sqlalchemy import create_engine

ENGINE = create_engine("oracle+cx_oracle://AURORA_APP@orcl-prod-01.aurora.internal:1521/BILLING")

def load_open_invoices(as_of):
    return pd.read_sql("SELECT INVOICE_ID, CUST_ID, AMOUNT_CENTS FROM INVOICE WHERE STATUS = 'OPEN'", ENGINE)

def reconcile(as_of):
    invoices = load_open_invoices(as_of)
    return invoices.groupby("CUST_ID").AMOUNT_CENTS.sum()
