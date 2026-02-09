-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS validated_emails (
    email TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    score NUMERIC,
    reason TEXT,
    is_disposable BOOLEAN DEFAULT FALSE,
    is_catch_all BOOLEAN DEFAULT FALSE,
    is_role_based BOOLEAN DEFAULT FALSE,
    is_gmail BOOLEAN DEFAULT FALSE,
    reputation TEXT,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    last_revalidated_at TIMESTAMPTZ,
    is_reactivated BOOLEAN DEFAULT FALSE,
    
    -- Metadata columns
    first_name TEXT,
    company_name TEXT,
    
    -- Outreach tracking columns
    sent_at TIMESTAMPTZ,
    campaign_id TEXT,
    email_template_id INT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_validated_emails_status ON validated_emails(status);
CREATE INDEX IF NOT EXISTS idx_validated_emails_sent_at ON validated_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_validated_emails_outreach_target 
    ON validated_emails(status, sent_at) 
    WHERE status = 'valid';
