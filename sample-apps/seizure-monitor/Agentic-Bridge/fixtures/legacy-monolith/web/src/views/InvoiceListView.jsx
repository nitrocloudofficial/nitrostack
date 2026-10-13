import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import MoneyCell from '../components/MoneyCell';

export default function InvoiceListView({ customerId }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    fetch(`/api/customers/${customerId}/invoices`).then(r => r.json()).then(d => setRows(d.invoices || []));
  }, [customerId]);

  const columns = [
    { key: 'INVOICE_ID', label: 'Invoice' },
    { key: 'AMOUNT_CENTS', label: 'Amount', render: v => <MoneyCell cents={v} /> },
    { key: 'STATUS', label: 'Status', render: v => <StatusPill status={v} /> }
  ];
  return <DataTable columns={columns} rows={rows} />;
}
