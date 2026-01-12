-- Add cloud products settings to organization_settings
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS google_sheet_url TEXT,
ADD COLUMN IF NOT EXISTS cloud_products_synced_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN organization_settings.google_sheet_url IS 'Google Sheets URL for cloud product pricing';
COMMENT ON COLUMN organization_settings.cloud_products_synced_at IS 'Last sync timestamp for cloud products';
