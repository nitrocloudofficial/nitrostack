import { useState, useEffect } from 'react';
import { Loan } from '../types';
import { loanService } from '../services/loanService';

export const useLoan = () => {
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [loanHistory, setLoanHistory] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const active = await loanService.getActiveLoan();
      setActiveLoan(active);
      const history = await loanService.getLoanHistory();
      setLoanHistory(history);
    } catch {
      // Fallback active loan for demo UI
      setActiveLoan({
        id: 101,
        user_id: 1,
        principal_amount: 25000,
        total_repayable: 27500,
        interest_rate: 12.5,
        tenure_months: 6,
        daily_repayment_amount: 152.78,
        remaining_balance: 18400,
        status: 'Active',
        created_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  return { activeLoan, loanHistory, loading, refetch: fetchLoans };
};
