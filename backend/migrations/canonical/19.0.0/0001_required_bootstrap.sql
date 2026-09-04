-- ZhaoXi 19.0.0 REQUIRED bootstrap data for a fresh canonical database.
-- Idempotent. No historical backfills. No production-only mutation.

INSERT INTO feature_flags (key,name,description,enabled,channels,roles,rollout_percent) VALUES
 ('marketplace.search2','Marketplace Search 2.0','Dynamic marketplace search and recommendations',true,'["beta","canary","stable"]','["customer"]',100),
 ('delivery.live-gps','Live GPS Delivery','Realtime delivery tracking',true,'["beta","canary"]','["customer","partner","driver","admin"]',100),
 ('payment.wechat','WeChat Pay','WeChat Pay checkout availability',false,'["beta","canary"]','["customer","partner","admin"]',100),
 ('support.ai','AI Support','AI customer service integration',true,'["beta","canary"]','["customer","partner","driver","admin"]',100)
ON CONFLICT (key) DO NOTHING;

INSERT INTO runtime_controls(app,access_mode,maintenance_enabled) VALUES
 ('customer','beta',false),('partner','beta',false),('driver','beta',false),('admin','beta',false)
ON CONFLICT(app) DO NOTHING;

INSERT INTO release_alert_policies(key,name,metric,comparator,threshold,severity,window_minutes,enabled,cooldown_minutes) VALUES
 ('runtime-critical','Critical runtime events','criticalErrors','>=',1,'critical',60,true,30),
 ('runtime-error-spike','Runtime error spike','runtimeErrors','>=',10,'warning',60,true,30),
 ('order-failure-rate','Order failure rate','orderFailureRate','>=',20,'warning',60,true,30),
 ('payment-failure-rate','Payment failure rate','paymentFailureRate','>=',15,'warning',60,true,30),
 ('support-backlog','Support backlog','openSupport','>=',25,'warning',60,true,60)
ON CONFLICT(key) DO NOTHING;

INSERT INTO rollout_guard_policies(app,enabled,health_window_minutes,warning_max_percent,critical_fallback_percent) VALUES
 ('customer',true,60,25,5),('partner',true,60,25,5),('driver',true,60,25,5)
ON CONFLICT(app) DO NOTHING;

INSERT INTO customer_ui_settings(scope,banner_effect,banner_auto_cycle,banner_cycle_seconds,recommendation_cycle_seconds,banner_content)
VALUES('default',0,false,20,60,'{"zh-CN":{"title":"欢迎来到岘港","subtitle":"赵喜陪伴您的每一天","cityLabel":"岘港"},"zh-TW":{"title":"歡迎來到峴港","subtitle":"趙喜陪伴您的每一天","cityLabel":"峴港"},"vi-VN":{"title":"Chào mừng đến Đà Nẵng","subtitle":"ZhaoXi đồng hành cùng bạn mỗi ngày","cityLabel":"Đà Nẵng"},"en-US":{"title":"Welcome to Da Nang","subtitle":"ZhaoXi is with you every day","cityLabel":"Da Nang"}}'::jsonb)
ON CONFLICT(scope) DO NOTHING;

INSERT INTO customer_support_settings(scope,basic_assistant_enabled,paid_human_enabled,paid_human_fee,paid_human_currency,emergency_priority)
VALUES('default',true,true,50000,'VND',true) ON CONFLICT(scope) DO NOTHING;

INSERT INTO delivery_pricing_policies(scope,base_fee,base_distance_km,per_km_fee,partner_subsidy_amount,subsidy_windows,timezone,max_delivery_radius_km,distance_provider,allow_geo_fallback,enabled)
VALUES('default',15000,2,8000,20000,'[{"start":"07:00","end":"10:00"},{"start":"13:00","end":"16:00"}]'::jsonb,'Asia/Ho_Chi_Minh',12,'google_routes',true,true)
ON CONFLICT(scope) DO NOTHING;

INSERT INTO support_sla_policies(priority,first_response_minutes,resolution_minutes) VALUES
 ('normal',240,1440),('urgent',60,480),('critical',15,120)
ON CONFLICT(priority) DO NOTHING;

INSERT INTO support_tags(name,color) VALUES
 ('Payment','amber'),('Partner','green'),('Technical','blue'),('Urgent','red'),('Housing','violet'),('Travel','cyan')
ON CONFLICT(name) DO NOTHING;

INSERT INTO customer_segments(code,name,description) VALUES
 ('priority_follow_up','Priority Follow-up','Customers requiring prioritized operational follow-up'),
 ('service_recovery','Service Recovery','Customers with an active service recovery case'),
 ('high_engagement','High Engagement','Customers with sustained first-party ZhaoXi activity')
ON CONFLICT(code) DO NOTHING;

INSERT INTO operations_routing_policies(name,work_kind)
SELECT 'Default intelligent routing','all'
WHERE NOT EXISTS(SELECT 1 FROM operations_routing_policies);

INSERT INTO operations_playbooks(code,name,work_kind,description,trigger_risk,steps) VALUES
 ('sla_escalation','SLA Escalation','all','Review SLA risk, assign owner and escalate with human approval.','critical','[{"key":"review","title":"Review context"},{"key":"assign","title":"Confirm owner","requiresApproval":true},{"key":"escalate","title":"Approve escalation","requiresApproval":true},{"key":"followup","title":"Schedule follow-up"}]'::jsonb),
 ('critical_recovery','Critical Service Recovery','service_recovery','Structured recovery handling with explicit approval gates.','critical','[{"key":"assess","title":"Assess impact"},{"key":"recovery_plan","title":"Approve recovery plan","requiresApproval":true},{"key":"execute","title":"Execute approved operational actions"},{"key":"verify","title":"Verify recovery"}]'::jsonb),
 ('support_overdue','Overdue Support','support','Recover overdue support case with supervisor approval.','overdue','[{"key":"review","title":"Review conversation"},{"key":"supervisor","title":"Supervisor escalation","requiresApproval":true},{"key":"response","title":"Prepare response"},{"key":"verify","title":"Verify SLA recovery"}]'::jsonb)
ON CONFLICT(code) DO NOTHING;
