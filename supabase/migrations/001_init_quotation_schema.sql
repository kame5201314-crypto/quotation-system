-- ============================================
-- Quotation System Schema (Public Schema)
-- Version: 1.0
-- ============================================

-- ============================================
-- 1. Organizations (組織)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT '我的公司',
  company_name TEXT,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  default_currency TEXT DEFAULT 'TWD',
  default_tax_rate DECIMAL(5, 4) DEFAULT 0.05,
  default_validity_days INTEGER DEFAULT 30,
  default_payment_terms TEXT,
  default_delivery_terms TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert default organization
INSERT INTO organizations (id, name) VALUES ('default', '我的公司') ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Product Categories (產品分類)
-- ============================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(org_id) WHERE NOT is_deleted;

-- ============================================
-- 3. Products (產品目錄)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  description TEXT,
  unit TEXT DEFAULT '件',
  cost_price DECIMAL(12, 2) DEFAULT 0,
  base_price DECIMAL(12, 2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(org_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(org_id, is_active) WHERE NOT is_deleted;

-- ============================================
-- 4. Customers (客戶資料)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  customer_level TEXT DEFAULT 'normal' CHECK (customer_level IN ('vip', 'normal', 'new')),
  credit_limit DECIMAL(12, 2) DEFAULT 0,
  payment_terms TEXT,
  notes TEXT,
  portal_password_hash TEXT,
  portal_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_customers_level ON customers(org_id, customer_level) WHERE NOT is_deleted;

-- ============================================
-- 5. Quote Templates (報價單模板)
-- ============================================
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  header_content TEXT,
  footer_content TEXT,
  terms_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_org ON quote_templates(org_id) WHERE NOT is_deleted;

-- ============================================
-- 6. Pricing Rules (定價規則)
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('tier', 'customer_level', 'bundle', 'promotion')),
  product_id UUID REFERENCES products(id),
  category_id UUID REFERENCES product_categories(id),
  conditions JSONB DEFAULT '{}'::jsonb,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'price_override')),
  discount_value DECIMAL(12, 2) NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_org ON pricing_rules(org_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(org_id, is_active, priority DESC) WHERE NOT is_deleted;

-- ============================================
-- 7. Approval Settings (審批設定)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  threshold_amount DECIMAL(12, 2) NOT NULL,
  approver_role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_approval_settings_org ON approval_settings(org_id) WHERE NOT is_deleted AND is_active;

-- ============================================
-- 8. Quotes (報價單主表)
-- ============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  quote_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'
  )),
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0.05,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'TWD' CHECK (currency IN ('TWD', 'USD', 'CNY', 'EUR', 'JPY')),
  issue_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  accepted_at TIMESTAMPTZ,
  payment_terms TEXT,
  delivery_terms TEXT,
  notes TEXT,
  internal_notes TEXT,
  template_id UUID REFERENCES quote_templates(id),
  version_number INTEGER DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes(id),
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  share_token TEXT UNIQUE,
  customer_signature TEXT,
  signed_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_number ON quotes(org_id, quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_org_status ON quotes(org_id, status) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON quotes(share_token) WHERE share_token IS NOT NULL;

-- ============================================
-- 9. Quote Items (報價單明細)
-- ============================================
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_description TEXT,
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT '件',
  unit_price DECIMAL(12, 2) NOT NULL,
  original_price DECIMAL(12, 2),
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL,
  applied_rules JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id) WHERE NOT is_deleted;

-- ============================================
-- 10. Quote Comments (報價單討論)
-- ============================================
CREATE TABLE IF NOT EXISTS quote_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id UUID,
  customer_id UUID REFERENCES customers(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_quote_comments_quote ON quote_comments(quote_id) WHERE NOT is_deleted;

-- ============================================
-- 11. Activity Logs (操作日誌)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'customer', 'system')),
  actor_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON activity_logs(org_id, created_at DESC);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_quote_templates_updated_at ON quote_templates;
CREATE TRIGGER update_quote_templates_updated_at
  BEFORE UPDATE ON quote_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS) - Allow all for now
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for simplicity)
CREATE POLICY "Allow all" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all" ON products FOR ALL USING (true);
CREATE POLICY "Allow all" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all" ON quotes FOR ALL USING (true);
CREATE POLICY "Allow all" ON quote_items FOR ALL USING (true);
CREATE POLICY "Allow all" ON quote_templates FOR ALL USING (true);
CREATE POLICY "Allow all" ON pricing_rules FOR ALL USING (true);
CREATE POLICY "Allow all" ON approval_settings FOR ALL USING (true);
CREATE POLICY "Allow all" ON quote_comments FOR ALL USING (true);
CREATE POLICY "Allow all" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON product_categories FOR ALL USING (true);

-- ============================================
-- Sample Data
-- ============================================

-- Insert default template
INSERT INTO quote_templates (org_id, name, is_default, primary_color, terms_content)
VALUES (
  'default',
  '標準報價單',
  true,
  '#3b82f6',
  '1. 報價有效期：本報價單自開立日起 30 天內有效。
2. 付款方式：訂金 30%，交貨前付清餘款。
3. 交貨期：確認訂單後 7-14 個工作天。
4. 以上報價未含稅，如需開立發票另加 5% 營業稅。'
) ON CONFLICT DO NOTHING;

-- Insert sample approval setting
INSERT INTO approval_settings (org_id, name, threshold_amount, approver_role)
VALUES ('default', '大額報價審批', 100000, 'manager') ON CONFLICT DO NOTHING;
