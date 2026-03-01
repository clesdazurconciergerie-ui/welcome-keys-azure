
-- Financial settings (company level, one per concierge)
CREATE TABLE public.financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text,
  logo_url text,
  address text,
  vat_number text,
  default_vat_rate numeric DEFAULT 20,
  invoice_prefix text DEFAULT 'FAC',
  next_invoice_number integer DEFAULT 1,
  iban text,
  legal_footer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fs_block_anon" ON public.financial_settings AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "fs_owner" ON public.financial_settings AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Property financial settings
CREATE TABLE public.property_financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  compensation_model text DEFAULT 'percentage',
  commission_rate numeric DEFAULT 20,
  cleaning_fee numeric DEFAULT 0,
  checkin_fee numeric DEFAULT 0,
  maintenance_rate numeric DEFAULT 0,
  ota_payout_recipient text DEFAULT 'owner',
  pricing_source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id)
);

ALTER TABLE public.property_financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pfs_block_anon" ON public.property_financial_settings AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pfs_owner" ON public.property_financial_settings AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Price calendar (daily prices per property)
CREATE TABLE public.price_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  date date NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(property_id, date)
);

ALTER TABLE public.price_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_block_anon" ON public.price_calendar AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pc_owner" ON public.price_calendar AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Bookings (financial records from iCal or manual)
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  source text DEFAULT 'manual',
  guest_name text,
  gross_amount numeric,
  commission_amount numeric DEFAULT 0,
  cleaning_amount numeric DEFAULT 0,
  checkin_amount numeric DEFAULT 0,
  maintenance_amount numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  owner_net numeric DEFAULT 0,
  concierge_revenue numeric DEFAULT 0,
  price_status text DEFAULT 'complete',
  financial_status text DEFAULT 'pending',
  notes text,
  calendar_event_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bk_block_anon" ON public.bookings AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bk_owner" ON public.bookings AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bk_property_owner_select" ON public.bookings AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.is_owner_of_property(auth.uid(), property_id));

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.owners(id),
  invoice_number text NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  subtotal numeric DEFAULT 0,
  vat_rate numeric DEFAULT 20,
  vat_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status text DEFAULT 'pending',
  notes text,
  company_snapshot jsonb,
  owner_snapshot jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_block_anon" ON public.invoices AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "inv_concierge" ON public.invoices AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "inv_owner_select" ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owners WHERE owners.id = invoices.owner_id AND owners.auth_user_id = auth.uid()));

-- Invoice items
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id),
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total numeric DEFAULT 0,
  item_type text DEFAULT 'revenue',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ii_block_anon" ON public.invoice_items AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ii_via_invoice" ON public.invoice_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "ii_owner_select" ON public.invoice_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i JOIN public.owners o ON o.id = i.owner_id WHERE i.id = invoice_items.invoice_id AND o.auth_user_id = auth.uid()));

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  category text DEFAULT 'other',
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date DEFAULT CURRENT_DATE,
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exp_block_anon" ON public.expenses AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "exp_owner" ON public.expenses AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_financial_settings_updated_at BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pfs_updated_at BEFORE UPDATE ON public.property_financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
