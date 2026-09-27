ALTER TABLE linkedin_accounts ADD COLUMN two_factor_received_at TIMESTAMP(3);
-- Historical timestamps are unknown; do not invent dates for existing keys.
CREATE FUNCTION stamp_two_factor_received_at() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NULLIF(BTRIM(NEW.two_factor), '') IS NOT NULL THEN
      NEW.two_factor_received_at := NOW();
    END IF;
  ELSIF NEW.two_factor IS DISTINCT FROM OLD.two_factor THEN
    NEW.two_factor_received_at := CASE WHEN NULLIF(BTRIM(NEW.two_factor), '') IS NULL THEN NULL ELSE NOW() END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER linkedin_accounts_two_factor_received
BEFORE INSERT OR UPDATE OF two_factor ON linkedin_accounts
FOR EACH ROW EXECUTE FUNCTION stamp_two_factor_received_at();
