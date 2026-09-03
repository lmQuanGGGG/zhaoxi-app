-- ZhaoXi 19.0.0 OPTIONAL seed data. Not required for schema/runtime bootstrap.
INSERT INTO customer_coupons(code,title,description,discount_type,discount_value,min_spend,currency,is_active)
VALUES('WELCOME50','{"zh-CN":"新用户优惠","zh-TW":"新用戶優惠","vi-VN":"Ưu đãi chào mừng","en-US":"Welcome offer"}','{"zh-CN":"首次使用赵喜可领取","zh-TW":"首次使用趙喜可領取","vi-VN":"Dành cho lần đầu sử dụng ZhaoXi","en-US":"For your first ZhaoXi experience"}','fixed',50000,200000,'VND',true)
ON CONFLICT(code) DO NOTHING;
