-- Fake fixtures for scripts/smoke-order-chat.mjs. LOCAL DATABASES ONLY.
INSERT INTO languages(code,name,native_name) VALUES ('vi-VN','Vietnamese','Tiếng Việt'),('zh-CN','Chinese','中文') ON CONFLICT DO NOTHING;
INSERT INTO users(id,nickname,preferred_locale) VALUES
 ('00000000-0000-0000-0000-0000000000a1','Khách A','vi-VN'),
 ('00000000-0000-0000-0000-0000000000b1','Khách B','vi-VN'),
 ('00000000-0000-0000-0000-0000000000a2','Chủ quán A','vi-VN'),
 ('00000000-0000-0000-0000-0000000000b2','Chủ nhà B','vi-VN');
INSERT INTO organizations(id,code,type,name,status) VALUES
 ('00000000-0000-0000-0000-00000000aaaa','TEST-A','restaurant','Quán Test A','active'),
 ('00000000-0000-0000-0000-00000000bbbb','TEST-B','housing','Nhà Test B','active');
INSERT INTO organization_members(organization_id,user_id,role) VALUES
 ('00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000000a2','owner'),
 ('00000000-0000-0000-0000-00000000bbbb','00000000-0000-0000-0000-0000000000b2','owner');
INSERT INTO modules(id,code,route) VALUES ('00000000-0000-0000-0000-0000000000f1','food','/food'),('00000000-0000-0000-0000-0000000000f2','housing','/housing');
INSERT INTO service_requests(id,request_code,module_id,customer_id,assigned_organization_id,locale,customer_name,customer_phone,title,status) VALUES
 ('00000000-0000-0000-0000-000000000c01','R-001','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000aaaa','vi-VN','Khách A','0900000001','Cơm gà','accepted')
 ON CONFLICT DO NOTHING;
INSERT INTO service_requests(id,request_code,module_id,customer_id,assigned_organization_id,locale,customer_name,customer_phone,title,status) VALUES
 ('00000000-0000-0000-0000-000000000c02','R-002','00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000bbbb','vi-VN','Khách A','0900000001','Thuê căn hộ','new'),
 ('00000000-0000-0000-0000-000000000c03','R-003','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000aaaa','vi-VN','Khách B','0900000002','Bún bò','accepted'),
 ('00000000-0000-0000-0000-000000000c04','R-004','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1',NULL,'vi-VN','Khách A','0900000001','Chưa gán','new');
INSERT INTO auth_sessions(user_id,role,organization_id,access_token_hash,refresh_token_hash,access_expires_at,refresh_expires_at) VALUES
 ('00000000-0000-0000-0000-0000000000a1','customer',NULL,encode(sha256('tok-ca'::bytea),'hex'),encode(sha256('r-ca'::bytea),'hex'),now()+interval '1 day',now()+interval '30 day'),
 ('00000000-0000-0000-0000-0000000000b1','customer',NULL,encode(sha256('tok-cb'::bytea),'hex'),encode(sha256('r-cb'::bytea),'hex'),now()+interval '1 day',now()+interval '30 day'),
 ('00000000-0000-0000-0000-0000000000a2','partner','00000000-0000-0000-0000-00000000aaaa',encode(sha256('tok-pa'::bytea),'hex'),encode(sha256('r-pa'::bytea),'hex'),now()+interval '1 day',now()+interval '30 day'),
 ('00000000-0000-0000-0000-0000000000b2','partner','00000000-0000-0000-0000-00000000bbbb',encode(sha256('tok-pb'::bytea),'hex'),encode(sha256('r-pb'::bytea),'hex'),now()+interval '1 day',now()+interval '30 day');
-- Local-only login for trying the apps against this fixture: username khach-a-test, PIN 673548.
UPDATE users SET username='khach-a-test', pin_hash='scrypt$BTI7_o93ViqtVBR2jIEFnA$FCLHSQVVrKYPWr7dNWnPS6VFlzBqjwNh8QCYN2iXQ3O056taetNAjFdR8cZSQTO7HbrVdQw1_qmXloEt_xnmjw' WHERE id='00000000-0000-0000-0000-0000000000a1';
