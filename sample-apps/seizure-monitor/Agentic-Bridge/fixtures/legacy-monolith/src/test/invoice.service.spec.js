const invoices = require('../../server/services/invoice.service');
jest.mock('../../server/db/aurora-orm');

describe('invoice.service', () => {
  it('lists invoices for a customer within a date window', done => {
    invoices.listInvoicesForCustomer('42', '2024-01-01', '2024-12-31', (err, rows) => {
      expect(err).toBeNull();
      expect(Array.isArray(rows)).toBe(true);
      done();
    });
  });
});
