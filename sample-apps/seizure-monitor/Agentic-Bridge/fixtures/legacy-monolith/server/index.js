const express = require('express');
const { initPool } = require('./db/connection-pool');
const invoiceRoutes = require('./routes/invoices.route');
const customerRoutes = require('./routes/customers.route');

const app = express();
app.use(express.json());
app.use('/api', invoiceRoutes);
app.use('/api', customerRoutes);

initPool().then(() => app.listen(8080, () => console.log('aurora-billing on 8080')));
