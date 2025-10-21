-- Migration: Change currency from NGN to PKR
-- Run this script to update existing data

-- Update Wallets table
UPDATE "Wallets" SET local_currency='PKR' WHERE local_currency='NGN';

-- Update Organisations table (if currency column exists)
UPDATE "Organisations" SET currency='PKR' WHERE currency='NGN';

-- Update Campaigns table (if local_currency column exists)
UPDATE "Campaigns" SET local_currency='PKR' WHERE local_currency='NGN';

-- Update Transactions table (if currency column exists)
UPDATE "Transactions" SET currency='PKR' WHERE currency='PKR';

-- Verify changes
SELECT 'Wallets' as table_name, COUNT(*) as pkr_count FROM "Wallets" WHERE local_currency='PKR'
UNION ALL
SELECT 'Organisations', COUNT(*) FROM "Organisations" WHERE currency='PKR'
UNION ALL
SELECT 'Campaigns', COUNT(*) FROM "Campaigns" WHERE local_currency='PKR'
UNION ALL
SELECT 'Transactions', COUNT(*) FROM "Transactions" WHERE currency='PKR';

