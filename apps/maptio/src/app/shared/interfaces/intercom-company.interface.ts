export interface IntercomCompany {
  created_at: number;
  custom_attributes: {
    free_trial_length: number;
    is_paying: Boolean;
    plan_limit: number;
  };
  plan: {
    name: string;
  };
  monthly_spend: number;
}
