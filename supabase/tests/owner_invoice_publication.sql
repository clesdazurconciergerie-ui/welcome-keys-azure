\set ON_ERROR_STOP on
INSERT INTO owners(id,concierge_user_id,auth_user_id,first_name,last_name) VALUES
('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','Propriétaire','Fictif');
INSERT INTO invoices(id,user_id,owner_id,invoice_number,issue_date,period_start,period_end,subtotal,vat_amount,total,status,type,company_snapshot) VALUES
('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','FICTIF-001','2026-10-30','2026-10-01','2026-10-10',300,0,300,'draft','invoice','{"approved_draft_fingerprint":"fictif"}');
INSERT INTO invoice_items(invoice_id,description,quantity,unit_price,total,vat_amount,line_type) VALUES
('10000000-0000-4000-8000-000000000004','Commission 20 % séjour fictif A',0.20,1000,200,0,'commission'),
('10000000-0000-4000-8000-000000000004','Commission 20 % séjour fictif B',0.20,500,100,0,'commission');
CREATE POLICY qa_concierge ON invoices FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY qa_owner ON invoices FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM owners o WHERE o.id=invoices.owner_id AND o.auth_user_id=auth.uid()));
CREATE POLICY qa_items ON invoice_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM invoices i WHERE i.id=invoice_items.invoice_id));

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM invoices)<>0 OR (SELECT count(*) FROM invoice_items)<>0 THEN RAISE EXCEPTION 'draft_exposed'; END IF;
 BEGIN PERFORM invoice_owner_delivery_preview('10000000-0000-4000-8000-000000000004');RAISE EXCEPTION 'owner_preview_allowed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'invoice_not_found' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ DECLARE v jsonb;r jsonb;ts text;
BEGIN
 v:=invoice_owner_delivery_preview('10000000-0000-4000-8000-000000000004');
 IF (v->>'total')::numeric<>300 OR v->>'destination'<>'owner_portal' THEN RAISE EXCEPTION 'bad_preview'; END IF;
 BEGIN PERFORM publish_invoice_to_owner('10000000-0000-4000-8000-000000000004',repeat('a',64));RAISE EXCEPTION 'stale_approval_allowed';EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'invoice_publication_changed' THEN RAISE; END IF; END;
 r:=publish_invoice_to_owner('10000000-0000-4000-8000-000000000004',v->>'fingerprint');
 IF r->>'state'<>'published' OR (r->>'email_sent')::boolean OR (r->>'pdf_generated')::boolean THEN RAISE EXCEPTION 'false_delivery'; END IF;
 ts:=r->>'published_at';
 r:=publish_invoice_to_owner('10000000-0000-4000-8000-000000000004',v->>'fingerprint');
 IF r->>'published_at'<>ts THEN RAISE EXCEPTION 'non_idempotent_publication'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM invoices)<>1 OR (SELECT count(*) FROM invoice_items)<>2 THEN RAISE EXCEPTION 'published_not_visible'; END IF;
 IF NOT (validate_invoice_before_pdf('10000000-0000-4000-8000-000000000004')->>'valid')::boolean THEN RAISE EXCEPTION 'owner_pdf_refused'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM invoices)<>0 OR (SELECT count(*) FROM invoice_items)<>0 THEN RAISE EXCEPTION 'other_owner_leak'; END IF;
 BEGIN PERFORM validate_invoice_before_pdf('10000000-0000-4000-8000-000000000004');RAISE EXCEPTION 'other_owner_pdf_allowed';EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'invoice_not_found' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
UPDATE invoices SET total=301 WHERE id='10000000-0000-4000-8000-000000000004';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 BEGIN PERFORM invoice_owner_delivery_preview('10000000-0000-4000-8000-000000000004');RAISE EXCEPTION 'bad_total_published';EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'invoice_totals_unreconciled' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
-- Authorised calculation: 20 % of each booking, rounded per line, no VAT.
DO $$ DECLARE v jsonb;
BEGIN
 v:=calculate_invoice_amounts('[{"quantity":"0.20","unit_price":"1000.03","vat_rate":"0"},{"quantity":"0.20","unit_price":"500.04","vat_rate":"0"}]',false,'line_half_up_v1');
 IF (v->>'total_cents')::bigint<>30002 OR (v->>'vat_cents')::bigint<>0 THEN RAISE EXCEPTION 'commission_calculation_failed'; END IF;
END $$;
SELECT 'owner-publication-and-20pct-commission: PASS';
