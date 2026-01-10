-- ============================================
-- Quotation System Schema
-- Version: 1.0
-- ============================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS quotation;

-- ============================================
-- 1. Product Categories (產品分類)
-- ============================================
CREATE TABLE quotation.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  parent_id UUID REFERENCES quotation.product_categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_product_categories_org ON quotation.product_categories(org_id) WHERE NOT is_deleted;
CREATE INDEX idx_product_categories_parent ON quotation.product_categories(parent_id) WHERE NOT is_deleted;

-- ============================================
-- 2. Products (產品目錄)
-- ============================================
CREATE TABLE quotation.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES quotation.product_categories(id),
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

CREATE UNIQUE INDEX idx_products_sku ON quotation.products(org_id, sku) WHERE NOT is_deleted;
CREATE INDEX idx_products_org ON quotation.products(org_id) WHERE NOT is_deleted;
CREATE INDEX idx_products_category ON quotation.products(category_id) WHERE NOT is_deleted;
CREATE INDEX idx_products_active ON quotation.products(org_id, is_active) WHERE NOT is_deleted;

-- ============================================
-- 3. Customers (客戶資料)
-- ============================================
CREATE TABLE quotation.customers (
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
  -- Customer portal access
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

CREATE INDEX idx_customers_org ON quotation.customers(org_id) WHERE NOT is_deleted;
CREATE INDEX idx_customers_level ON quotation.customers(org_id, customer_level) WHERE NOT is_deleted;
CREATE INDEX idx_customers_email ON quotation.customers(contact_email) WHERE NOT is_deleted;

-- ============================================
-- 4. Quote Templates (報價單模板)
-- ============================================
CREATE TABLE quotation.quote_templates (
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

CREATE INDEX idx_quote_templates_org ON quotation.quote_templates(org_id) WHERE NOT is_deleted;

-- ============================================
-- 5. Pricing Rules (定價規則)
-- ============================================
CREATE TABLE quotation.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('tier', 'customer_level', 'bundle', 'promotion')),
  product_id UUID REFERENCES quotation.products(id),
  category_id UUID REFERENCES quotation.product_categories(id),
  conditions JSONB DEFAULT '{}'::jsonb,
  -- conditions example:
  -- tier: {"min_qty": 10, "max_qty": 50}
  -- customer_level: {"level": "vip"}
  -- bundle: {"product_ids": ["uuid1", "uuid2"]}
  -- promotion: {}
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'price_override')),
  discount_value DECIMAL(12, 2) NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
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

CREATE INDEX idx_pricing_rules_org ON quotation.pricing_rules(org_id) WHERE NOT is_deleted;
CREATE INDEX idx_pricing_rules_active ON quotation.pricing_rules(org_id, is_active, priority DESC) WHERE NOT is_deleted;
CREATE INDEX idx_pricing_rules_product ON quotation.pricing_rules(product_id) WHERE NOT is_deleted;
CREATE INDEX idx_pricing_rules_category ON quotation.pricing_rules(category_id) WHERE NOT is_deleted;
CREATE INDEX idx_pricing_rules_type ON quotation.pricing_rules(org_id, rule_type) WHERE NOT is_deleted;

-- ============================================
-- 6. Approval Settings (審批設定)
-- ============================================
CREATE TABLE quotation.approval_settings (
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

CREATE INDEX idx_approval_settings_org ON quotation.approval_settings(org_id) WHERE NOT is_deleted AND is_active;

-- ============================================
-- 7. Quotes (報價單主表)
-- ============================================
CREATE TABLE quotation.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  quote_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES quotation.customers(id),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',           -- 草稿
    'pending_approval', -- 待審批
    'approved',        -- 已審批
    'sent',            -- 已發送
    'accepted',        -- 已接受
    'rejected',        -- 已拒絕
    'expired',         -- 已過期
    'cancelled'        -- 已取消
  )),

  -- Amounts
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0.05, -- 5% default tax
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'TWD' CHECK (currency IN ('TWD', 'USD', 'CNY', 'EUR', 'JPY')),

  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  accepted_at TIMESTAMPTZ,

  -- Terms
  payment_terms TEXT,
  delivery_terms TEXT,
  notes TEXT, -- Customer-visible notes
  internal_notes TEXT, -- Internal only
  template_id UUID REFERENCES quotation.quote_templates(id),

  -- Version control
  version_number INTEGER DEFAULT 1,
  parent_quote_id UUID REFERENCES quotation.quotes(id),

  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Customer interaction
  share_token TEXT UNIQUE,
  customer_signature TEXT, -- Base64 encoded signature
  signed_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,

  -- Standard fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX idx_quotes_number ON quotation.quotes(org_id, quote_number);
CREATE INDEX idx_quotes_org_status ON quotation.quotes(org_id, status) WHERE NOT is_deleted;
CREATE INDEX idx_quotes_customer ON quotation.quotes(customer_id) WHERE NOT is_deleted;
CREATE INDEX idx_quotes_created_by ON quotation.quotes(created_by) WHERE NOT is_deleted;
CREATE INDEX idx_quotes_share_token ON quotation.quotes(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_quotes_valid_until ON quotation.quotes(valid_until) WHERE NOT is_deleted AND status IN ('sent', 'approved');

-- ============================================
-- 8. Quote Items (報價單明細)
-- ============================================
CREATE TABLE quotation.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  quote_id UUID NOT NULL REFERENCES quotation.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES quotation.products(id),

  -- Product snapshot (at quote time)
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_description TEXT,

  -- Pricing
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT '件',
  unit_price DECIMAL(12, 2) NOT NULL,
  original_price DECIMAL(12, 2),
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL,

  -- Applied rules
  applied_rules JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"rule_id": "uuid", "name": "VIP折扣", "discount": 10}]

  sort_order INTEGER DEFAULT 0,
  notes TEXT,

  -- Standard fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_quote_items_quote ON quotation.quote_items(quote_id) WHERE NOT is_deleted;
CREATE INDEX idx_quote_items_product ON quotation.quote_items(product_id) WHERE NOT is_deleted;

-- ============================================
-- 9. Quote Comments (報價單討論)
-- ============================================
CREATE TABLE quotation.quote_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  quote_id UUID NOT NULL REFERENCES quotation.quotes(id) ON DELETE CASCADE,
  user_id UUID, -- Internal user
  customer_id UUID REFERENCES quotation.customers(id), -- Customer
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- If true, only visible to internal users
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_quote_comments_quote ON quotation.quote_comments(quote_id) WHERE NOT is_deleted;

-- ============================================
-- 10. Activity Logs (操作日誌)
-- ============================================
CREATE TABLE quotation.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL, -- quote, customer, product, etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- created, updated, status_changed, sent, viewed, signed, etc.
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'customer', 'system')),
  actor_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  -- Example: {"field": "status", "old": "draft", "new": "sent"}
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_logs_entity ON quotation.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_org ON quotation.activity_logs(org_id, created_at DESC);
CREATE INDEX idx_activity_logs_actor ON quotation.activity_logs(actor_type, actor_id);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION quotation.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON quotation.products
  FOR EACH ROW EXECUTE FUNCTION quotation.update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON quotation.customers
  FOR EACH ROW EXECUTE FUNCTION quotation.update_updated_at();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotation.quotes
  FOR EACH ROW EXECUTE FUNCTION quotation.update_updated_at();

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON quotation.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION quotation.update_updated_at();

CREATE TRIGGER update_quote_templates_updated_at
  BEFORE UPDATE ON quotation.quote_templates
  FOR EACH ROW EXECUTE FUNCTION quotation.update_updated_at();

-- Generate quote number
CREATE OR REPLACE FUNCTION quotation.generate_quote_number(p_org_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year_month TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year_month := to_char(now(), 'YYYYMM');

  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 'Q-' || v_year_month || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM quotation.quotes
  WHERE org_id = p_org_id
    AND quote_number LIKE 'Q-' || v_year_month || '-%';

  v_number := 'Q-' || v_year_month || '-' || LPAD(v_seq::TEXT, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Recalculate quote totals
CREATE OR REPLACE FUNCTION quotation.recalculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quotation.quotes q
  SET
    subtotal = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM quotation.quote_items
      WHERE quote_id = q.id AND NOT is_deleted
    ),
    tax_amount = (
      SELECT COALESCE(SUM(line_total), 0) * q.tax_rate
      FROM quotation.quote_items
      WHERE quote_id = q.id AND NOT is_deleted
    ),
    total_amount = (
      SELECT COALESCE(SUM(line_total), 0) * (1 + q.tax_rate) - q.discount_amount
      FROM quotation.quote_items
      WHERE quote_id = q.id AND NOT is_deleted
    )
  WHERE q.id = COALESCE(NEW.quote_id, OLD.quote_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_quote_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON quotation.quote_items
  FOR EACH ROW EXECUTE FUNCTION quotation.recalculate_quote_totals();

-- ============================================
-- Sample Data for Testing (Optional)
-- ============================================

-- Insert default template
INSERT INTO quotation.quote_templates (org_id, name, is_default, primary_color, terms_content)
VALUES (
  'default',
  '標準報價單',
  true,
  '#3b82f6',
  '1. 報價有效期：本報價單自開立日起 30 天內有效。
2. 付款方式：訂金 30%，交貨前付清餘款。
3. 交貨期：確認訂單後 7-14 個工作天。
4. 以上報價未含稅，如需開立發票另加 5% 營業稅。'
);

-- Insert sample approval setting
INSERT INTO quotation.approval_settings (org_id, name, threshold_amount, approver_role)
VALUES ('default', '大額報價審批', 100000, 'manager');
