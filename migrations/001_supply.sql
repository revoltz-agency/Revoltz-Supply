CREATE TABLE supply_users(id text PRIMARY KEY,email text NOT NULL,owner_id text,role text NOT NULL CHECK(role IN ('restaurant','supplier','admin')),business text NOT NULL,area text NOT NULL,approval text NOT NULL DEFAULT 'pending' CHECK(approval IN ('pending','approved','suspended')));
CREATE TABLE supply_rfqs(id text PRIMARY KEY,restaurant_id text NOT NULL REFERENCES supply_users(id),title text NOT NULL,category text NOT NULL CHECK(category IN ('Packaging','Cleaning supplies','Dry ingredients','Consumables')),items text NOT NULL,area text NOT NULL,required_date text NOT NULL,status text NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted','Reviewing','Quotes Requested','Quotes Received','Supplier Selected','Completed','Cancelled','Expired')),created text NOT NULL);
CREATE INDEX supply_rfqs_owner ON supply_rfqs(restaurant_id);
CREATE TABLE supply_assignments(rfq_id text NOT NULL REFERENCES supply_rfqs(id),supplier_id text NOT NULL REFERENCES supply_users(id),created text NOT NULL,PRIMARY KEY(rfq_id,supplier_id));
CREATE TABLE supply_quotes(id text PRIMARY KEY,rfq_id text NOT NULL REFERENCES supply_rfqs(id),supplier_id text NOT NULL REFERENCES supply_users(id),lines text NOT NULL,tax_paise integer NOT NULL CHECK(tax_paise>=0),delivery_paise integer NOT NULL CHECK(delivery_paise>=0),total_paise integer NOT NULL CHECK(total_paise>0 AND total_paise<=1000000000),valid_until text NOT NULL,notes text NOT NULL,created text NOT NULL,UNIQUE(rfq_id,supplier_id),UNIQUE(rfq_id,id),FOREIGN KEY(rfq_id,supplier_id) REFERENCES supply_assignments(rfq_id,supplier_id));
CREATE TABLE supply_selections(rfq_id text PRIMARY KEY REFERENCES supply_rfqs(id),quote_id text NOT NULL REFERENCES supply_quotes(id),created text NOT NULL,FOREIGN KEY(rfq_id,quote_id) REFERENCES supply_quotes(rfq_id,id));
CREATE TABLE supply_audit(id text PRIMARY KEY,actor text NOT NULL,action text NOT NULL,entity text NOT NULL,created text NOT NULL);
CREATE INDEX supply_audit_entity ON supply_audit(entity);
ALTER TABLE supply_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_audit ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated Data API access is granted. Application queries are
-- authenticated and tenant-scoped by the Node backend; its table-owner role
-- is deliberate and bypasses RLS. The private schema is not a REST API schema.
