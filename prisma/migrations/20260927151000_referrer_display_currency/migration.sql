ALTER TABLE referrers ADD COLUMN display_currency TEXT NOT NULL DEFAULT 'USD' CHECK (display_currency IN ('USD', 'PHP'));
