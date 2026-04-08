def calculate_proportional_lot(master_volume: float, master_balance: float, slave_balance: float, risk_multiplier: float = 1.0) -> float:
    """
    Calculate the order volume for a slave account based on proportional balance and risk multiplier.
    Returns lot size rounded to 2 decimal places (standard for most brokers like 0.01).
    """
    if master_balance <= 0 or slave_balance <= 0:
        return 0.0
        
    ratio = slave_balance / master_balance
    slave_volume = master_volume * ratio * risk_multiplier
    
    # Floor to nearest 0.01
    return round(int(slave_volume * 100) / 100.0, 2)
