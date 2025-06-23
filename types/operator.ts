export interface OperatorInfo {
    address: string;
    commission: {
      commission_rates: {
        rate: string;
        max_rate: string;
        max_change_rate: string;
      };
      update_time: string;
    };
    earnings_addr: string;
    approve_addr: string;
    operator_meta_info: string;
    client_chain_earnings_addr: {
      earning_info_list: any[]; // Update this type if needed
    };
    apr: number;
  }