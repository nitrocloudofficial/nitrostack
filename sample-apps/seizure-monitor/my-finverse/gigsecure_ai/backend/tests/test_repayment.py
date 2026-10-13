def test_smart_pause_logic():
    income = 0.0
    daily_repayment_amount = 150.0
    
    if income == 0.0:
        debit_amount = 0.0
        smart_pause_activated = True
    else:
        debit_amount = min(income * 0.14, daily_repayment_amount * 1.25)
        smart_pause_activated = False

    assert debit_amount == 0.0
    assert smart_pause_activated is True
