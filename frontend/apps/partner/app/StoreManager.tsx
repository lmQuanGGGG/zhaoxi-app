"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useZhaoXiSession } from "@zhaoxi/auth";
import {
  useZhaoXiLocale,
  type ZhaoXiLocale,
  localizeOrganizationName,
} from "@zhaoxi/i18n";
import { ActionButton, Surface, appShellStyle } from "@zhaoxi/ui";
import { getCached, setCached } from "./_lib/client-cache";
import PartnerWorkspaceNav from "./PartnerWorkspaceNav";
import PartnerOrderAlerts from "./PartnerOrderAlerts";
import RestaurantOperationsPanel from "./RestaurantOperationsPanel";
import FoodCommercialEditor from "./FoodCommercialEditor";
import CouponManager from "./CouponManager";

type Item = {
  id: string;
  name?: string;
  summary?: string;
  priceFrom?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  isEnabled?: boolean;
};

type ItemDraft = {
  name: string;
  summary: string;
  price: string;
  image: string;
  imageFile?: File;
  imagePreview?: string;
  extra: Record<string, string>;
};

type DynamicField = { key: string; label: string; type?: "text" | "number" | "select" | "date"; options?: string[] };

const copy = {
  "zh-CN": {
    title: "商家管理", orders: "订单", store: "店铺资料", menu: "商品与服务", storeName: "商家名称",
    logo: "店铺 Logo", banners: "菜品轮播图", saveStore: "保存店铺", add: "新增商品或服务", name: "名称",
    summary: "简介", price: "价格", image: "商品图片", save: "保存", empty: "暂无商品", language: "语言",
    category: "经营类别", chooseImage: "选择图片", chooseImages: "选择多张图片", uploading: "上传中…", remove: "删除",
    urlFallback: "或粘贴图片网址", uploadHint: "支持 JPG、PNG、WEBP、GIF，单张不超过 5 MB。",
    preview: "预览", saved: "已保存", uploadFailed: "图片上传失败", details: "服务详情", deleteItem: "删除项目", deleteConfirm: "确定删除这个项目吗？", logout: "退出登录", confirmBanners: "确认轮播图", bannersConfirmed: "轮播图已确认", syncServices: "同步服务", syncing: "同步中…", synced: "已同步到客户端", syncHint: "确认轮播图和商品后再同步到客户端。", lockItem: "锁定菜品", unlockItem: "重新上架", available: "供应中", soldOut: "已售罄", bannerPreview: "轮播图预览", imageUploaded: "图片已上传", address: "地址", contactPhone: "联系电话", wechat: "微信", infoTab: "商家资料", ordersTab: "订单管理", housingGallery:"房源相册", addGallery:"添加房源图片", galleryHint:"可上传多张图片用于客户左右滑动查看。",
    categories: { food: "餐饮", housing: "住房", visa: "签证", "car-rental": "租车", translation: "翻译", travel: "旅游", payment: "支付", community: "社区", market: "商城", emergency: "紧急服务" },
  },
  "zh-TW": {
    title: "商家管理", orders: "訂單", store: "店鋪資料", menu: "商品與服務", storeName: "商家名稱",
    logo: "店鋪 Logo", banners: "餐點輪播圖", saveStore: "儲存店鋪", add: "新增商品或服務", name: "名稱",
    summary: "簡介", price: "價格", image: "商品圖片", save: "儲存", empty: "暫無商品", language: "語言",
    category: "經營類別", chooseImage: "選擇圖片", chooseImages: "選擇多張圖片", uploading: "上傳中…", remove: "刪除",
    urlFallback: "或貼上圖片網址", uploadHint: "支援 JPG、PNG、WEBP、GIF，單張不超過 5 MB。",
    preview: "預覽", saved: "已儲存", uploadFailed: "圖片上傳失敗", details: "服務詳情", deleteItem: "刪除項目", deleteConfirm: "確定刪除這個項目嗎？", logout: "登出", confirmBanners: "確認輪播圖", bannersConfirmed: "輪播圖已確認", syncServices: "同步服務", syncing: "同步中…", synced: "已同步到客戶端", syncHint: "確認輪播圖與項目後再同步到客戶端。", lockItem: "鎖定餐點", unlockItem: "重新上架", available: "供應中", soldOut: "已售罄", bannerPreview: "輪播圖預覽", imageUploaded: "圖片已上傳", address: "地址", contactPhone: "聯絡電話", wechat: "微信", infoTab: "商家資料", ordersTab: "訂單管理", housingGallery:"房源相簿", addGallery:"新增房源圖片", galleryHint:"可上傳多張圖片供客戶左右滑動查看。",
    categories: { food: "餐飲", housing: "住房", visa: "簽證", "car-rental": "租車", translation: "翻譯", travel: "旅遊", payment: "支付", community: "社區", market: "商城", emergency: "緊急服務" },
  },
  "vi-VN": {
    title: "Quản lý gian hàng", orders: "Đơn hàng", store: "Thông tin gian hàng", menu: "Sản phẩm và dịch vụ", storeName: "Tên gian hàng",
    logo: "Logo gian hàng", banners: "Banner trình chiếu món ăn/dịch vụ", saveStore: "Lưu gian hàng", add: "Thêm sản phẩm hoặc dịch vụ", name: "Tên",
    summary: "Mô tả ngắn", price: "Giá bán", image: "Ảnh sản phẩm/dịch vụ", save: "Lưu", empty: "Chưa có sản phẩm hoặc dịch vụ", language: "Ngôn ngữ",
    category: "Loại dịch vụ", chooseImage: "Chọn ảnh", chooseImages: "Chọn nhiều ảnh", uploading: "Đang tải ảnh…", remove: "Xóa",
    urlFallback: "Hoặc dán URL hình ảnh", uploadHint: "Hỗ trợ JPG, PNG, WEBP, GIF; tối đa 5 MB mỗi ảnh.",
    preview: "Xem trước", saved: "Đã lưu", uploadFailed: "Tải ảnh thất bại", details: "Thông tin chi tiết", deleteItem: "Xóa mục", deleteConfirm: "Bạn có chắc muốn xóa mục này?", logout: "Đăng xuất", confirmBanners: "Xác nhận banner", bannersConfirmed: "Banner đã xác nhận", syncServices: "Đồng bộ dịch vụ", syncing: "Đang đồng bộ…", synced: "Đã đồng bộ sang Customer", syncHint: "Xác nhận banner và nội dung trước khi đồng bộ sang Customer.", lockItem: "Khóa món", unlockItem: "Mở bán lại", available: "Đang bán", soldOut: "Hết món", bannerPreview: "Xem thử banner chạy", imageUploaded: "Ảnh đã tải lên", address: "Địa chỉ", contactPhone: "Số điện thoại liên hệ", wechat: "WeChat", infoTab: "Thông tin nhà hàng", ordersTab: "Quản lý đơn hàng / dịch vụ", housingGallery:"Bộ ảnh nhà/phòng", addGallery:"Thêm ảnh vào gallery", galleryHint:"Có thể tải nhiều ảnh để Customer vuốt ngang khi xem chi tiết.",
    categories: { food: "Ăn uống", housing: "Nhà ở", visa: "Thị thực", "car-rental": "Thuê xe", translation: "Phiên dịch", travel: "Du lịch", payment: "Thanh toán", community: "Cộng đồng", market: "Gian hàng", emergency: "Khẩn cấp" },
  },
  "en-US": {
    title: "Store management", orders: "Orders", store: "Store profile", menu: "Products and services", storeName: "Store name",
    logo: "Store logo", banners: "Food/service banner slideshow", saveStore: "Save store", add: "Add product or service", name: "Name",
    summary: "Short description", price: "Price", image: "Product/service image", save: "Save", empty: "No products or services yet", language: "Language",
    category: "Service category", chooseImage: "Choose image", chooseImages: "Choose multiple images", uploading: "Uploading…", remove: "Remove",
    urlFallback: "Or paste an image URL", uploadHint: "JPG, PNG, WEBP and GIF; maximum 5 MB per image.",
    preview: "Preview", saved: "Saved", uploadFailed: "Image upload failed", details: "Service details", deleteItem: "Delete item", deleteConfirm: "Delete this item?", logout: "Sign out", confirmBanners: "Confirm banners", bannersConfirmed: "Banners confirmed", syncServices: "Sync services", syncing: "Syncing…", synced: "Synced to Customer", syncHint: "Confirm banners and items before syncing to Customer.", lockItem: "Lock item", unlockItem: "Reopen item", available: "Available", soldOut: "Sold out", bannerPreview: "Banner slideshow preview", imageUploaded: "Image uploaded", address: "Address", contactPhone: "Contact phone", wechat: "WeChat", infoTab: "Store information", ordersTab: "Order / service management", housingGallery:"Property gallery", addGallery:"Add gallery photos", galleryHint:"Upload multiple photos for the Customer swipe gallery.",
    categories: { food: "Food & drink", housing: "Housing", visa: "Visa", "car-rental": "Car rental", translation: "Interpretation", travel: "Travel", payment: "Payments", community: "Community", market: "Marketplace", emergency: "Emergency" },
  },
} as const;

const moduleFields: Record<string, Record<ZhaoXiLocale, DynamicField[]>> = {
  food: {
    "zh-CN": [{ key: "dishCategory", label: "菜品分类" }],
    "zh-TW": [{ key: "dishCategory", label: "餐點分類" }],
    "vi-VN": [{ key: "dishCategory", label: "Nhóm món" }],
    "en-US": [{ key: "dishCategory", label: "Dish category" }],
  },
  housing: {
    "zh-CN": [{ key: "propertyType", label: "房屋类型" }, { key: "bedrooms", label: "卧室数量", type: "number" }, { key: "bathrooms", label: "卫生间", type: "number" }, { key: "areaSqm", label: "面积（平方米）", type: "number" }, {key:"district",label:"区域"},{key:"propertyAddress",label:"房源详细地址"},{key:"housingAvailabilityStatus",label:"房源状态",type:"select",options:["available","reserved","rented"]},{key:"furnished",label:"家具情况",type:"select",options:["yes","no","partial"]},{key:"depositMonths",label:"押金（月）",type:"number"},{key:"availableFrom",label:"可入住日期",type:"date"},{key:"minLeaseMonths",label:"最短租期（月）",type:"number"},{key:"amenities",label:"配套设施（用逗号分隔）"},{key:"latitude",label:"纬度",type:"number"},{key:"longitude",label:"经度",type:"number"}],
    "zh-TW": [{ key: "propertyType", label: "房屋類型" }, { key: "bedrooms", label: "臥室數量", type: "number" }, { key: "bathrooms", label: "衛浴", type: "number" }, { key: "areaSqm", label: "面積（平方米）", type: "number" }, {key:"district",label:"區域"},{key:"propertyAddress",label:"房源詳細地址"},{key:"housingAvailabilityStatus",label:"房源狀態",type:"select",options:["available","reserved","rented"]},{key:"furnished",label:"家具情況",type:"select",options:["yes","no","partial"]},{key:"depositMonths",label:"押金（月）",type:"number"},{key:"availableFrom",label:"可入住日期",type:"date"},{key:"minLeaseMonths",label:"最短租期（月）",type:"number"},{key:"amenities",label:"配套設施（逗號分隔）"},{key:"latitude",label:"緯度",type:"number"},{key:"longitude",label:"經度",type:"number"}],
    "vi-VN": [{ key: "propertyType", label: "Loại nhà" }, { key: "bedrooms", label: "Số phòng ngủ", type: "number" }, { key: "bathrooms", label: "Số WC", type: "number" }, { key: "areaSqm", label: "Diện tích (m²)", type: "number" }, {key:"district",label:"Khu vực"},{key:"propertyAddress",label:"Địa chỉ nhà/phòng"},{key:"housingAvailabilityStatus",label:"Trạng thái nhà/phòng",type:"select",options:["available","reserved","rented"]},{key:"furnished",label:"Nội thất",type:"select",options:["yes","no","partial"]},{key:"depositMonths",label:"Đặt cọc (tháng)",type:"number"},{key:"availableFrom",label:"Có thể vào ở từ",type:"date"},{key:"minLeaseMonths",label:"Thời hạn thuê tối thiểu (tháng)",type:"number"},{key:"amenities",label:"Tiện ích (ngăn cách bằng dấu phẩy)"},{key:"latitude",label:"Vĩ độ",type:"number"},{key:"longitude",label:"Kinh độ",type:"number"}],
    "en-US": [{ key: "propertyType", label: "Property type" }, { key: "bedrooms", label: "Bedrooms", type: "number" }, { key: "bathrooms", label: "Bathrooms", type: "number" }, { key: "areaSqm", label: "Area (m²)", type: "number" }, {key:"district",label:"Area / district"},{key:"propertyAddress",label:"Property address"},{key:"housingAvailabilityStatus",label:"Property status",type:"select",options:["available","reserved","rented"]},{key:"furnished",label:"Furnishing",type:"select",options:["yes","no","partial"]},{key:"depositMonths",label:"Deposit (months)",type:"number"},{key:"availableFrom",label:"Available from",type:"date"},{key:"minLeaseMonths",label:"Minimum lease (months)",type:"number"},{key:"amenities",label:"Amenities (comma separated)"},{key:"latitude",label:"Latitude",type:"number"},{key:"longitude",label:"Longitude",type:"number"}],
  },
  "car-rental": {
    "zh-CN": [{ key: "vehicleType", label: "车型" }, { key: "seats", label: "座位数", type: "number" }, { key: "priceUnit", label: "计价单位", type: "select", options: ["hour", "day", "trip"] }],
    "zh-TW": [{ key: "vehicleType", label: "車型" }, { key: "seats", label: "座位數", type: "number" }, { key: "priceUnit", label: "計價單位", type: "select", options: ["hour", "day", "trip"] }],
    "vi-VN": [{ key: "vehicleType", label: "Loại xe" }, { key: "seats", label: "Số chỗ", type: "number" }, { key: "priceUnit", label: "Đơn vị tính giá", type: "select", options: ["hour", "day", "trip"] }],
    "en-US": [{ key: "vehicleType", label: "Vehicle type" }, { key: "seats", label: "Seats", type: "number" }, { key: "priceUnit", label: "Pricing unit", type: "select", options: ["hour", "day", "trip"] }],
  },
  visa: {
    "zh-CN": [{ key: "visaType", label: "签证类型" }, { key: "processingDays", label: "办理天数", type: "number" }],
    "zh-TW": [{ key: "visaType", label: "簽證類型" }, { key: "processingDays", label: "辦理天數", type: "number" }],
    "vi-VN": [{ key: "visaType", label: "Loại thị thực" }, { key: "processingDays", label: "Số ngày xử lý", type: "number" }],
    "en-US": [{ key: "visaType", label: "Visa type" }, { key: "processingDays", label: "Processing days", type: "number" }],
  },
  translation: {
    "zh-CN": [{ key: "languagePair", label: "语言组合" }, { key: "priceUnit", label: "计价单位", type: "select", options: ["hour", "day", "document"] }],
    "zh-TW": [{ key: "languagePair", label: "語言組合" }, { key: "priceUnit", label: "計價單位", type: "select", options: ["hour", "day", "document"] }],
    "vi-VN": [{ key: "languagePair", label: "Cặp ngôn ngữ" }, { key: "priceUnit", label: "Đơn vị tính giá", type: "select", options: ["hour", "day", "document"] }],
    "en-US": [{ key: "languagePair", label: "Language pair" }, { key: "priceUnit", label: "Pricing unit", type: "select", options: ["hour", "day", "document"] }],
  },
  travel: {
    "zh-CN": [{key:"experienceType",label:"体验类型"},{key:"destination",label:"目的地"},{key:"duration",label:"行程时长"},{key:"departurePoint",label:"出发地点"},{key:"maxGuests",label:"最多人数",type:"number"},{key:"serviceLanguage",label:"服务语言"},{key:"availableDays",label:"可预约日期"},{key:"startTime",label:"出发时间"},{key:"startTimes",label:"多个出发时间（逗号分隔）"},{key:"travelAvailabilityStatus",label:"体验状态",type:"select",options:["available","unavailable"]},{key:"bookingNoticeHours",label:"提前预订（小时）",type:"number"},{key:"includes",label:"费用包含（逗号分隔）"},{key:"excludes",label:"费用不含（逗号分隔）"}],
    "zh-TW": [{key:"experienceType",label:"體驗類型"},{key:"destination",label:"目的地"},{key:"duration",label:"行程時長"},{key:"departurePoint",label:"出發地點"},{key:"maxGuests",label:"最多人數",type:"number"},{key:"serviceLanguage",label:"服務語言"},{key:"availableDays",label:"可預約日期"},{key:"startTime",label:"出發時間"},{key:"startTimes",label:"多個出發時間（逗號分隔）"},{key:"travelAvailabilityStatus",label:"體驗狀態",type:"select",options:["available","unavailable"]},{key:"bookingNoticeHours",label:"提前預訂（小時）",type:"number"},{key:"includes",label:"費用包含（逗號分隔）"},{key:"excludes",label:"費用不含（逗號分隔）"}],
    "vi-VN": [{key:"experienceType",label:"Loại trải nghiệm"},{key:"destination",label:"Điểm đến"},{key:"duration",label:"Thời lượng tour"},{key:"departurePoint",label:"Điểm khởi hành"},{key:"maxGuests",label:"Số khách tối đa",type:"number"},{key:"serviceLanguage",label:"Ngôn ngữ phục vụ"},{key:"availableDays",label:"Ngày có thể đặt"},{key:"startTime",label:"Giờ khởi hành"},{key:"startTimes",label:"Nhiều khung giờ (ngăn cách dấu phẩy)"},{key:"travelAvailabilityStatus",label:"Trạng thái trải nghiệm",type:"select",options:["available","unavailable"]},{key:"bookingNoticeHours",label:"Đặt trước tối thiểu (giờ)",type:"number"},{key:"includes",label:"Bao gồm (ngăn cách dấu phẩy)"},{key:"excludes",label:"Không bao gồm (ngăn cách dấu phẩy)"}],
    "en-US": [{key:"experienceType",label:"Experience type"},{key:"destination",label:"Destination"},{key:"duration",label:"Tour duration"},{key:"departurePoint",label:"Departure point"},{key:"maxGuests",label:"Maximum guests",type:"number"},{key:"serviceLanguage",label:"Service language"},{key:"availableDays",label:"Available days"},{key:"startTime",label:"Start time"},{key:"startTimes",label:"Multiple start times (comma separated)"},{key:"travelAvailabilityStatus",label:"Experience status",type:"select",options:["available","unavailable"]},{key:"bookingNoticeHours",label:"Minimum booking notice (hours)",type:"number"},{key:"includes",label:"Includes (comma separated)"},{key:"excludes",label:"Excludes (comma separated)"}],
  },
  payment: {
    "zh-CN": [{ key: "paymentMethod", label: "支付方式" }, { key: "feeRate", label: "服务费率（%）", type: "number" }],
    "zh-TW": [{ key: "paymentMethod", label: "支付方式" }, { key: "feeRate", label: "服務費率（%）", type: "number" }],
    "vi-VN": [{ key: "paymentMethod", label: "Phương thức thanh toán" }, { key: "feeRate", label: "Phí dịch vụ (%)", type: "number" }],
    "en-US": [{ key: "paymentMethod", label: "Payment method" }, { key: "feeRate", label: "Service fee (%)", type: "number" }],
  },
  community: {
    "zh-CN": [{ key: "eventDate", label: "活动日期" }, { key: "eventLocation", label: "活动地点" }],
    "zh-TW": [{ key: "eventDate", label: "活動日期" }, { key: "eventLocation", label: "活動地點" }],
    "vi-VN": [{ key: "eventDate", label: "Ngày sự kiện" }, { key: "eventLocation", label: "Địa điểm" }],
    "en-US": [{ key: "eventDate", label: "Event date" }, { key: "eventLocation", label: "Event location" }],
  },
  market: {
    "zh-CN": [{ key: "sku", label: "商品编号" }, { key: "stock", label: "库存", type: "number" }],
    "zh-TW": [{ key: "sku", label: "商品編號" }, { key: "stock", label: "庫存", type: "number" }],
    "vi-VN": [{ key: "sku", label: "Mã sản phẩm" }, { key: "stock", label: "Tồn kho", type: "number" }],
    "en-US": [{ key: "sku", label: "SKU" }, { key: "stock", label: "Stock", type: "number" }],
  },
  emergency: {
    "zh-CN": [{ key: "hotline", label: "紧急电话" }, { key: "availability", label: "服务时间" }],
    "zh-TW": [{ key: "hotline", label: "緊急電話" }, { key: "availability", label: "服務時間" }],
    "vi-VN": [{ key: "hotline", label: "Số điện thoại khẩn cấp" }, { key: "availability", label: "Thời gian phục vụ" }],
    "en-US": [{ key: "hotline", label: "Emergency hotline" }, { key: "availability", label: "Availability" }],
  },
};

function localizedOption(fieldKey:string,option:string,locale:ZhaoXiLocale){
 const housingStatus:Record<string,Record<ZhaoXiLocale,string>>={
  available:{"zh-CN":"可租","zh-TW":"可租","vi-VN":"Còn trống","en-US":"Available"},
  reserved:{"zh-CN":"已预订","zh-TW":"已預訂","vi-VN":"Đã giữ chỗ","en-US":"Reserved"},
  rented:{"zh-CN":"已出租","zh-TW":"已出租","vi-VN":"Đã cho thuê","en-US":"Rented"},
  yes:{"zh-CN":"全家具","zh-TW":"全家具","vi-VN":"Đầy đủ nội thất","en-US":"Fully furnished"},
  no:{"zh-CN":"无家具","zh-TW":"無家具","vi-VN":"Không nội thất","en-US":"Unfurnished"},
  partial:{"zh-CN":"部分家具","zh-TW":"部分家具","vi-VN":"Nội thất một phần","en-US":"Partly furnished"},
 };
 if(fieldKey==="housingAvailabilityStatus"||fieldKey==="furnished")return housingStatus[option]?.[locale]||option;
 return option;
}

const modulePresentation: Record<string, Record<ZhaoXiLocale, { store: string; menu: string; add: string; image: string; banners: string }>> = {
  food: {
    "zh-CN": { store: "餐厅资料", menu: "菜单", add: "新增菜品", image: "菜品图片", banners: "餐厅菜品轮播图" },
    "zh-TW": { store: "餐廳資料", menu: "菜單", add: "新增餐點", image: "餐點圖片", banners: "餐廳餐點輪播圖" },
    "vi-VN": { store: "Thông tin nhà hàng", menu: "Thực đơn", add: "Thêm món ăn", image: "Ảnh món ăn", banners: "Banner món ăn của nhà hàng" },
    "en-US": { store: "Restaurant profile", menu: "Menu", add: "Add dish", image: "Dish image", banners: "Restaurant food banners" },
  },
  housing: {
    "zh-CN": { store: "房源机构资料", menu: "房源列表", add: "发布房源", image: "房源图片", banners: "房源展示图" },
    "zh-TW": { store: "房源機構資料", menu: "房源列表", add: "發布房源", image: "房源圖片", banners: "房源展示圖" },
    "vi-VN": { store: "Thông tin đơn vị nhà ở", menu: "Danh sách bất động sản", add: "Đăng nhà/phòng", image: "Ảnh nhà/phòng", banners: "Banner bất động sản" },
    "en-US": { store: "Housing provider profile", menu: "Property listings", add: "Add property", image: "Property image", banners: "Property banners" },
  },
  travel: {
    "zh-CN": { store: "旅行社资料", menu: "旅游产品", add: "发布行程", image: "行程图片", banners: "目的地轮播图" },
    "zh-TW": { store: "旅行社資料", menu: "旅遊產品", add: "發布行程", image: "行程圖片", banners: "目的地輪播圖" },
    "vi-VN": { store: "Thông tin đơn vị du lịch", menu: "Tour và trải nghiệm", add: "Thêm tour", image: "Ảnh tour", banners: "Banner điểm đến" },
    "en-US": { store: "Travel provider profile", menu: "Tours & experiences", add: "Add tour", image: "Tour image", banners: "Destination banners" },
  },
  "car-rental": {
    "zh-CN": { store: "租车公司资料", menu: "车辆列表", add: "添加车辆", image: "车辆图片", banners: "车辆展示图" },
    "zh-TW": { store: "租車公司資料", menu: "車輛列表", add: "新增車輛", image: "車輛圖片", banners: "車輛展示圖" },
    "vi-VN": { store: "Thông tin đơn vị thuê xe", menu: "Danh sách xe", add: "Thêm xe", image: "Ảnh xe", banners: "Banner xe" },
    "en-US": { store: "Car rental profile", menu: "Vehicles", add: "Add vehicle", image: "Vehicle image", banners: "Vehicle banners" },
  },
  visa: {
    "zh-CN": { store: "签证机构资料", menu: "签证服务", add: "新增签证服务", image: "服务图片", banners: "签证服务展示图" },
    "zh-TW": { store: "簽證機構資料", menu: "簽證服務", add: "新增簽證服務", image: "服務圖片", banners: "簽證服務展示圖" },
    "vi-VN": { store: "Thông tin đơn vị thị thực", menu: "Dịch vụ thị thực", add: "Thêm dịch vụ thị thực", image: "Ảnh dịch vụ", banners: "Banner dịch vụ thị thực" },
    "en-US": { store: "Visa provider profile", menu: "Visa services", add: "Add visa service", image: "Service image", banners: "Visa service banners" },
  },
  translation: {
    "zh-CN": { store: "翻译机构资料", menu: "翻译服务", add: "新增翻译服务", image: "服务图片", banners: "翻译服务展示图" },
    "zh-TW": { store: "翻譯機構資料", menu: "翻譯服務", add: "新增翻譯服務", image: "服務圖片", banners: "翻譯服務展示圖" },
    "vi-VN": { store: "Thông tin đơn vị phiên dịch", menu: "Dịch vụ phiên dịch", add: "Thêm dịch vụ phiên dịch", image: "Ảnh dịch vụ", banners: "Banner phiên dịch" },
    "en-US": { store: "Translation provider profile", menu: "Translation services", add: "Add translation service", image: "Service image", banners: "Translation banners" },
  },
  payment: {
    "zh-CN": { store: "生活缴费机构资料", menu: "支付与充值服务", add: "新增支付服务", image: "服务图标", banners: "支付服务展示图" },
    "zh-TW": { store: "生活繳費機構資料", menu: "支付與儲值服務", add: "新增支付服務", image: "服務圖示", banners: "支付服務展示圖" },
    "vi-VN": { store: "Thông tin đơn vị thanh toán", menu: "Thanh toán và nạp tiền", add: "Thêm dịch vụ thanh toán", image: "Ảnh dịch vụ", banners: "Banner thanh toán" },
    "en-US": { store: "Payment provider profile", menu: "Payment & top-up services", add: "Add payment service", image: "Service image", banners: "Payment banners" },
  },
  community: {
    "zh-CN": { store: "社区服务机构资料", menu: "活动与生活服务", add: "发布活动或服务", image: "活动图片", banners: "社区活动展示图" },
    "zh-TW": { store: "社區服務機構資料", menu: "活動與生活服務", add: "發布活動或服務", image: "活動圖片", banners: "社區活動展示圖" },
    "vi-VN": { store: "Thông tin đơn vị cộng đồng", menu: "Sự kiện và dịch vụ đời sống", add: "Đăng sự kiện hoặc dịch vụ", image: "Ảnh sự kiện/dịch vụ", banners: "Banner cộng đồng" },
    "en-US": { store: "Community provider profile", menu: "Events & lifestyle services", add: "Add event or service", image: "Event/service image", banners: "Community banners" },
  },
  market: {
    "zh-CN": { store: "商城资料", menu: "商品目录", add: "新增商品", image: "商品图片", banners: "商城促销图" },
    "zh-TW": { store: "商城資料", menu: "商品目錄", add: "新增商品", image: "商品圖片", banners: "商城促銷圖" },
    "vi-VN": { store: "Thông tin gian hàng", menu: "Danh mục sản phẩm", add: "Thêm sản phẩm", image: "Ảnh sản phẩm", banners: "Banner khuyến mãi" },
    "en-US": { store: "Marketplace profile", menu: "Product catalog", add: "Add product", image: "Product image", banners: "Promotion banners" },
  },
  emergency: {
    "zh-CN": { store: "紧急服务机构资料", menu: "紧急服务项目", add: "新增紧急服务", image: "服务标识", banners: "紧急服务展示图" },
    "zh-TW": { store: "緊急服務機構資料", menu: "緊急服務項目", add: "新增緊急服務", image: "服務標識", banners: "緊急服務展示圖" },
    "vi-VN": { store: "Thông tin đơn vị khẩn cấp", menu: "Dịch vụ khẩn cấp", add: "Thêm dịch vụ khẩn cấp", image: "Ảnh nhận diện", banners: "Banner hỗ trợ khẩn cấp" },
    "en-US": { store: "Emergency provider profile", menu: "Emergency services", add: "Add emergency service", image: "Service identity image", banners: "Emergency banners" },
  },
};

function ImagePreview({ url, alt, height = 120 }: { url: string; alt: string; height?: number }) {
  if (!url) return null;
  return <img src={url} alt={alt} style={{ width: "100%", maxWidth: 420, height, objectFit: "cover", borderRadius: 14, border: "1px solid #dfe7e2", display: "block" }} />;
}

function ItemImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <div style={{ width: 100, height: 100, borderRadius: 14, background: "#eef8f1", display: "grid", placeItems: "center", fontSize: 34 }}>🍽️</div>;
  return <img src={url} alt={alt} onError={() => setFailed(true)} style={{ width: 100, height: 100, borderRadius: 14, objectFit: "cover", border: "1px solid #dfe7e2", display: "block" }} />;
}

export default function StoreManager() {
  const session = useZhaoXiSession();
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const orgId = session?.organizationId || "";
  const [moduleCode, setModuleCode] = useState("food");
  const cacheKey = `partner_store_${orgId}_${moduleCode}_${locale}`;
  const cachedData = typeof window !== "undefined" ? getCached<{ items: Item[]; org: any }>(cacheKey) : null;
  const [items, setItems] = useState<Item[]>(() => cachedData?.items || []);
  const [storeName, setStoreName] = useState(() => cachedData?.org?.name || "");
  const [storeAddress, setStoreAddress] = useState(() => cachedData?.org?.address || "");
  const [contactPhone, setContactPhone] = useState(() => cachedData?.org?.phone || "");
  const [wechat, setWechat] = useState(() => cachedData?.org?.wechat || "");
  const [orgMetadata, setOrgMetadata] = useState<Record<string, unknown>>(() => cachedData?.org?.metadata || {});
  const [logo, setLogo] = useState(() => cachedData?.org?.logo || "");
  const [bannerUrls, setBannerUrls] = useState<string[]>(() => cachedData?.org?.bannerUrls || []);
  const [form, setForm] = useState<ItemDraft>({ name: "", summary: "", price: "", image: "", extra: {} });
  const [queuedItems, setQueuedItems] = useState<ItemDraft[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [msg, setMsg] = useState("");
  const [itemNotice, setItemNotice] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerPreviews, setBannerPreviews] = useState<string[]>([]);
  const [itemPreview, setItemPreview] = useState("");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannersConfirmed, setBannersConfirmed] = useState(() => Boolean(cachedData?.org?.bannersConfirmed));
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const bannersInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);

  const activeFields = useMemo(() => moduleFields[moduleCode]?.[locale] || [], [moduleCode, locale]);
  const presentation = modulePresentation[moduleCode]?.[locale] || { store: t.store, menu: t.menu, add: t.add, image: t.image, banners: t.banners };

  const load = useCallback(async () => {
    if (!orgId) return;
    const [serviceResponse, orgResponse] = await Promise.all([
      fetch(`/api/platform-services?organizationId=${orgId}&module=${moduleCode}&locale=${locale}&includeDrafts=1`, { cache: "no-store" }),
      fetch(`/api/platform-organizations?status=active`, { cache: "no-store" }),
    ]);
    const d = await serviceResponse.json();
    const od = await orgResponse.json();
    const loadedItems = Array.isArray(d?.data) ? d.data : [];
    setItems(loadedItems);
    const org = (Array.isArray(od?.data) ? od.data : []).find((x: { id: string }) => x.id === orgId);
    if (org) {
      const metadata = (org.metadata || {}) as Record<string, unknown>;
      setOrgMetadata(metadata);
      const names = (metadata.localizedNames || {}) as Record<string, unknown>;
      const sName = typeof names[locale] === "string" ? String(names[locale]) : localizeOrganizationName(locale, org.code, org.name, metadata);
      setStoreName(sName);
      const sLogo = String(metadata.draftLogoUrl || metadata.logoUrl || "");
      setLogo(sLogo);
      const draftBanners = Array.isArray(metadata.draftBannerUrls) ? metadata.draftBannerUrls : metadata.bannerUrls;
      const sBanners = Array.isArray(draftBanners) ? draftBanners.map(String) : [];
      setBannerUrls(sBanners);
      const sAddr = String(metadata.address || org.address || "");
      setStoreAddress(sAddr);
      const sPhone = String(metadata.contactPhone || metadata.phone || "");
      setContactPhone(sPhone);
      const sWechat = String(metadata.wechat || "");
      setWechat(sWechat);
      const sConfirmed = Boolean(metadata.bannerDraftConfirmed);
      setBannersConfirmed(sConfirmed);
      setCached(cacheKey, {
        items: loadedItems,
        org: {
          name: sName,
          logo: sLogo,
          bannerUrls: sBanners,
          address: sAddr,
          phone: sPhone,
          wechat: sWechat,
          metadata,
          bannersConfirmed: sConfirmed,
        }
      });
    }
  }, [orgId, locale, moduleCode, cacheKey]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const total = bannerPreviews.length || bannerUrls.length;
    if (total < 2) { setBannerIndex(0); return; }
    const timer = window.setInterval(() => setBannerIndex((current) => (current + 1) % total), 3200);
    return () => window.clearInterval(timer);
  }, [bannerPreviews.length, bannerUrls.length]);

  function createPreviewUrl(file: File) {
    return URL.createObjectURL(file);
  }

  async function uploadFile(file: File, folder: string) {
    const body = new FormData();
    body.set("file", file);
    body.set("folder", folder);
    body.set("organizationId", orgId);
    const response = await fetch("/api/media/upload", { method: "POST", body });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data?.url) throw new Error(String(payload?.error?.message || payload?.error?.code || payload?.error || t.uploadFailed));
    return String(payload.data.url);
  }

  async function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = createPreviewUrl(file);
    setLogoPreview(previewUrl);
    try {
      setUploading("logo");
      const uploadedUrl = await uploadFile(file, "logo");
      setLogo(uploadedUrl);
      setLogoPreview("");
      URL.revokeObjectURL(previewUrl);
      setMsg(`✓ ${t.imageUploaded}`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : t.uploadFailed);
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function chooseBanners(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []) as File[];
    if (!files.length) return;
    const previews = files.map(createPreviewUrl);
    setBannerPreviews(previews);
    setBannersConfirmed(false);
    try {
      setUploading("banners");
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await uploadFile(file, "banners"));
      setBannerUrls((current) => [...current, ...uploaded].slice(0, 10));
      setBannerPreviews([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setMsg(`✓ ${t.imageUploaded}`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : t.uploadFailed);
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function chooseItemImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = createPreviewUrl(file);
    setItemPreview(previewUrl);
    setForm((current) => ({ ...current, image: "", imageFile: file, imagePreview: previewUrl }));
    setItemNotice("✓ Đã chọn ảnh. Ảnh chỉ được tải lên khi bạn bấm ‘Lưu các món trong danh sách’.");
    event.target.value = "";
  }

  async function saveStore() {
    if (!orgId) { setMsg("Không tìm thấy gian hàng đang đăng nhập."); return; }
    if (!storeName.trim() || !storeAddress.trim() || !contactPhone.trim()) { setMsg(`Vui lòng điền các mục ${requiredText}: ${t.storeName}, ${t.address}, ${t.contactPhone}.`); return; }
    const response = await fetch(`/api/platform-organizations/${orgId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ metadata: { ...orgMetadata, localizedNames: { ...((orgMetadata.localizedNames || {}) as Record<string, unknown>), [locale]: storeName }, draftLogoUrl: logo, draftBannerUrls: bannerUrls, bannerDraftConfirmed: bannersConfirmed, address: storeAddress, contactPhone, wechat } }),
    });
    const payload = await response.json().catch(() => null);
    setMsg(response.ok ? `✓ ${t.saved}` : String(payload?.error?.message || payload?.error?.code || "Không thể lưu gian hàng. Vui lòng thử lại."));
  }

  async function addItem(draft: ItemDraft) {
    if (!orgId) { setMsg("Không tìm thấy gian hàng đang đăng nhập."); return false; }
    const invalid = itemValidation(draft);
    if (invalid) { setMsg(`Vui lòng điền: ${invalid}`); return false; }
    let uploadedImage = draft.image;
    try {
      if (!uploadedImage && draft.imageFile) uploadedImage = await uploadFile(draft.imageFile, "items");
    } catch (error) {
      const message = error instanceof Error ? error.message : t.uploadFailed;
      setMsg(message);
      setItemNotice(`Không thể tải ảnh của “${draft.name}”: ${message}`);
      return false;
    }

    // Keep one immutable snapshot so the uploaded image is bound to the exact
    // service returned by the create request, never matched later by name.
    const submitted = {
      name: draft.name.trim(),
      summary: draft.summary.trim(),
      price: Number(draft.price || 0),
      image: uploadedImage,
      extra: { ...draft.extra },
    };
    const translations: Record<string, unknown> = {
      [locale]: {
        name: submitted.name,
        summary: submitted.summary,
        description: submitted.summary,
      },
    };
    const metadata: Record<string, unknown> = {
      imageUrl: submitted.image,
      emoji: moduleCode === "food" ? "🍽️" : "🏷️",
      isAvailable: true,
      syncStatus: "draft",
      ...submitted.extra,
    };

    const response = await fetch("/api/platform-services", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        moduleCode,
        price: submitted.price,
        isEnabled: false,
        metadata,
        translations,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMsg(String(payload?.error?.message || payload?.error || "Unable to create service"));
      return false;
    }

    // Explicitly persist the same image against the newly-created service ID.
    // This makes the flow deterministic even if an older backend normalizes
    // metadata during POST creation.
    const created = payload?.data as Item | undefined;
    if (created?.id && submitted.image) {
      const imageResponse = await fetch(`/api/platform-services/${created.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          isEnabled: false,
          metadata: {
            ...(created.metadata || {}),
            ...metadata,
            imageUrl: submitted.image,
          },
        }),
      });
      if (!imageResponse.ok) {
        setMsg("Món đã được tạo nhưng chưa thể gắn ảnh. Vui lòng thử lại.");
        return false;
      }
    }
    if (draft.imagePreview) URL.revokeObjectURL(draft.imagePreview);
    return true;
  }

  async function saveQueuedItems() {
    if (!queuedItems.length) { queueItem(); return; }
    setSavingItems(true);
    let saved = 0;
    const remaining: ItemDraft[] = [];
    for (const draft of queuedItems) {
      if (await addItem(draft)) saved += 1;
      else remaining.push(draft);
    }
    setQueuedItems(remaining);
    await load();
    setSavingItems(false);
    setMsg(saved === queuedItems.length ? `✓ Đã lưu ${saved} món` : `Đã lưu ${saved}/${queuedItems.length} món; các món còn lại cần kiểm tra lại.`);
    setSyncNotice(saved === queuedItems.length ? "Món đã lưu xong. Bạn có thể đồng bộ dịch vụ sang Customer." : "Còn món chưa lưu được; hãy xử lý xong trước khi đồng bộ.");
  }

  async function updateItem(item: Item, patch: Record<string, unknown>) {
    await fetch(`/api/platform-services/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: orgId, isEnabled: false, ...patch }) });
    await load();
  }

  async function replaceExistingImage(item: Item, file?: File) {
    if (!file) return;
    try {
      setUploading(item.id);
      const imageUrl = await uploadFile(file, "items");
      await updateItem(item, { metadata: { ...(item.metadata || {}), imageUrl } });
    } catch (error) { setMsg(error instanceof Error ? error.message : t.uploadFailed); }
    finally { setUploading(null); }
  }

  async function appendHousingGallery(item: Item, files?: FileList | null) {
    if (!files?.length) return;
    try {
      setUploading(`gallery-${item.id}`);
      const galleryRaw=item.metadata?.galleryUrls;
      const current=Array.isArray(galleryRaw)?galleryRaw.filter((x):x is string=>typeof x==="string"&&!!x):[];
      const next=[...current];
      for(const file of (Array.from(files) as File[]).slice(0,12)){
        const url=await uploadFile(file,"housing");
        if(url&&!next.includes(url))next.push(url);
      }
      await updateItem(item,{metadata:{...(item.metadata||{}),galleryUrls:next}});
    } catch(error){setMsg(error instanceof Error?error.message:t.uploadFailed)}
    finally{setUploading(null)}
  }

  async function removeHousingGalleryImage(item:Item,url:string){
    const galleryRaw=item.metadata?.galleryUrls;
    const current=Array.isArray(galleryRaw)?galleryRaw.filter((x):x is string=>typeof x==="string"&&!!x):[];
    await updateItem(item,{metadata:{...(item.metadata||{}),galleryUrls:current.filter(x=>x!==url)}});
  }

  async function confirmBanners() {
    if (!orgId) { setMsg("Không tìm thấy gian hàng đang đăng nhập."); return; }
    try {
      const response = await fetch(`/api/platform-organizations/${orgId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metadata: { ...orgMetadata, draftLogoUrl: logo, draftBannerUrls: bannerUrls, bannerDraftConfirmed: true, address: storeAddress, contactPhone, wechat } }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error?.message || payload?.error?.code || "Không thể xác nhận banner."));
      setBannersConfirmed(true);
      setMsg(`✓ ${t.bannersConfirmed}`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Không thể xác nhận banner.");
    }
  }

  async function syncServices() {
    if (!orgId) return;
    if (queuedItems.length) {
      setSyncNotice(`Hãy bấm “Lưu các món trong danh sách (${queuedItems.length})” trước. Món hiện chưa được tạo trên database.`);
      return;
    }
    if (!items.length) {
      setSyncNotice("Chưa có món nào đã lưu để đồng bộ. Hãy thêm và lưu ít nhất một món trước.");
      return;
    }
    if (bannerUrls.length > 0 && !bannersConfirmed) {
      setMsg(t.syncHint);
      setSyncNotice(t.syncHint);
      return;
    }
    try {
      setSyncing(true);
      const latestResponse = await fetch(`/api/platform-services?organizationId=${orgId}&module=${moduleCode}&locale=${locale}&includeDrafts=1&refresh=${Date.now()}`, { cache: "no-store" });
      const latestPayload = await latestResponse.json();
      const latestItems: Item[] = Array.isArray(latestPayload?.data) ? latestPayload.data : items;
      const storeResponse = await fetch(`/api/platform-organizations/${orgId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metadata: {
          ...orgMetadata,
          localizedNames: { ...((orgMetadata.localizedNames || {}) as Record<string, unknown>), [locale]: storeName },
          draftLogoUrl: logo,
          draftBannerUrls: bannerUrls,
          bannerDraftConfirmed: bannersConfirmed,
          logoUrl: logo,
          bannerUrls,
          address: storeAddress,
          contactPhone,
          wechat,
          catalogSyncedAt: new Date().toISOString(),
        } }),
      });
      if (!storeResponse.ok) throw new Error("Store sync failed");
      for (const item of latestItems) {
        const response = await fetch(`/api/platform-services/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            organizationId: orgId,
            isEnabled: true,
            metadata: { ...(item.metadata || {}), syncStatus: "published", syncedAt: new Date().toISOString() },
          }),
        });
        if (!response.ok) throw new Error(`Unable to sync ${item.name || item.id}`);
      }
      const publishResponse = await fetch("/api/platform-publish", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, moduleCode }),
      });
      if (!publishResponse.ok) throw new Error("Marketplace publish failed");
      setMsg(`✓ ${t.synced}`);
      setSyncNotice(`✓ ${t.synced}`);
      await load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Sync failed");
      setSyncNotice(error instanceof Error ? error.message : "Không thể đồng bộ dịch vụ.");
    } finally {
      setSyncing(false);
    }
  }

  async function toggleItemAvailability(item: Item) {
    const isAvailable = item.metadata?.isAvailable !== false;
    const response = moduleCode==="food"
      ? await fetch(`/api/partner-food-availability/${item.id}`, {
          method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({available:!isAvailable}),
        })
      : await fetch(`/api/platform-services/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            organizationId: orgId,
            isEnabled: item.isEnabled ?? true,
            metadata: { ...(item.metadata || {}), isAvailable: !isAvailable },
          }),
        });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMsg(String(payload?.error || "Unable to update item availability"));
      return;
    }
    await load();
  }

  async function deleteItem(item: Item) {
    if (!orgId || !window.confirm(t.deleteConfirm)) return;
    const response = await fetch(`/api/platform-services/${item.id}?organizationId=${encodeURIComponent(orgId)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMsg(String(payload?.error?.message || payload?.error || "Delete failed"));
      return;
    }
    await load();
  }

  const visibleLogo = logoPreview || logo;
  const visibleBanners = bannerPreviews.length ? bannerPreviews : bannerUrls;
  const visibleItemImage = itemPreview || form.image;
  const syncBlockedMessage = queuedItems.length
    ? `Cần lưu ${queuedItems.length} món trong danh sách vào database trước khi đồng bộ.`
    : !items.length ? "Chưa có món đã lưu để đồng bộ." : "";
  const requiredText = locale === "vi-VN" ? "bắt buộc" : locale === "en-US" ? "required" : "必填";
  const optionalText = locale === "vi-VN" ? "không bắt buộc" : locale === "en-US" ? "optional" : "选填";
  const queueText = locale === "vi-VN" ? "Thêm vào danh sách" : locale === "en-US" ? "Add to list" : "加入列表";
  const saveQueuedText = locale === "vi-VN" ? "Lưu các món trong danh sách" : locale === "en-US" ? "Save listed items" : "保存列表中的项目";

  function itemValidation(candidate: ItemDraft) {
    if (!candidate.name.trim()) return `${t.name} (${requiredText})`;
    if (!candidate.price.trim() || Number(candidate.price) < 0) return `${t.price} (${requiredText})`;
    if (!candidate.image.trim() && !candidate.imageFile) return `${presentation.image} — hãy chọn ảnh hoặc dán URL ảnh`;
    return "";
  }

  function queueItem() {
    const invalid = itemValidation(form);
    if (invalid) {
      const message = `Vui lòng điền: ${invalid}`;
      setMsg(message);
      setItemNotice(form.name.trim() && form.price.trim() && !form.image.trim() ? "Ảnh đang chỉ là bản xem trước hoặc chưa tải xong. Chọn lại ảnh, chờ ‘Ảnh đã sẵn sàng’, hoặc dán URL ảnh công khai." : message);
      return;
    }
    setQueuedItems((current) => [...current, { ...form, extra: { ...form.extra } }]);
    setForm({ name: "", summary: "", price: "", image: "", extra: {} });
    setItemPreview("");
    setMsg(`✓ ${queueText}`);
    setItemNotice("✓ Đã thêm vào danh sách. Ảnh chưa được tải lên database; điền món tiếp theo, rồi bấm ‘Lưu các món trong danh sách’ khi xong.");
  }

  return <main style={{ ...appShellStyle, maxWidth: 1100, margin: "0 auto", padding: 20 }}>
    <header style={{ textAlign: "center", padding: "10px 0 4px" }}>
      <small style={{ color: "#07c160", fontWeight: 900, letterSpacing: ".08em" }}>ZHAOXI PARTNER</small>
      <h1 style={{ margin: "7px 0 14px", fontSize: "clamp(28px,4vw,40px)" }}>{t.title}</h1>

    </header>
    <PartnerWorkspaceNav/>
    <PartnerOrderAlerts/>
    {moduleCode==="food"&&<><RestaurantOperationsPanel organizationId={orgId}/><CouponManager organizationId={orgId}/></>}

    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", border: "1px dashed #cbd5e1", borderRadius: 12, background: "rgba(255,255,255,.55)" }}><small>{t.category}</small><select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)}>{Object.entries(t.categories).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
    </div>

    {msg && <div role="status" style={{ marginTop: 14, padding: 12, borderRadius: 12, background: msg.startsWith("✓") ? "#ecfdf3" : "#fff1f2", color: msg.startsWith("✓") ? "#087a3e" : "#b42318", fontWeight: 700 }}>{msg}</div>}

    <Surface style={{ marginTop: 18 }}>
      <h2>{presentation.store}</h2>
      <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 14 }}><b style={{ color: "#dc2626" }}>*</b> {requiredText} · ({optionalText})</p>
      <label style={{ display: "grid", gap: 6, marginBottom: 16 }}>{t.storeName} <b style={{ color: "#dc2626" }}>* {requiredText}</b><input required value={storeName} onChange={(e) => setStoreName(e.target.value)} style={{ padding: 12 }} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 18 }}>
        <label style={{ display: "grid", gap: 6 }}>{t.address} <b style={{ color: "#dc2626" }}>* {requiredText}</b><input required value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} style={{ padding: 12 }} /></label>
        <label style={{ display: "grid", gap: 6 }}>{t.contactPhone} <b style={{ color: "#dc2626" }}>* {requiredText}</b><input required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" style={{ padding: 12 }} /></label>
        <label style={{ display: "grid", gap: 6 }}>{t.wechat} <small>({optionalText})</small><input value={wechat} onChange={(e) => setWechat(e.target.value)} style={{ padding: 12 }} /></label>
      </div>
      <section style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <b>{t.logo} <small>({optionalText})</small></b><ImagePreview url={visibleLogo} alt={t.logo} height={130} />
        <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={chooseLogo} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><ActionButton tone="neutral" onClick={() => logoInput.current?.click()}>{uploading === "logo" ? t.uploading : t.chooseImage}</ActionButton>{logo && <ActionButton tone="neutral" onClick={() => { setLogo(""); setLogoPreview(""); }}>{t.remove}</ActionButton>}</div>
        <input placeholder={t.urlFallback} value={logo} onChange={(e) => setLogo(e.target.value)} style={{ padding: 10 }} /><small>{t.uploadHint}</small>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <b>{presentation.banners} <small>({optionalText})</small></b>
        <small style={{ color: "#64748b", fontWeight: 700 }}>{t.bannerPreview}</small>
        {visibleBanners.length > 0 && <div style={{ position: "relative", width: "100%", maxWidth: 760, height: 280, overflow: "hidden", borderRadius: 20, background: "#eef8f1", border: "1px solid #dfe7e2" }}>
          {visibleBanners.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${presentation.banners} ${index + 1}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: index === bannerIndex ? 1 : 0, transition: "opacity .6s ease" }} />)}
          {visibleBanners.length > 1 && <><button type="button" onClick={() => setBannerIndex((bannerIndex - 1 + visibleBanners.length) % visibleBanners.length)} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 999, border: 0, background: "rgba(0,0,0,.45)", color: "white", fontSize: 22 }}>‹</button><button type="button" onClick={() => setBannerIndex((bannerIndex + 1) % visibleBanners.length)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 999, border: 0, background: "rgba(0,0,0,.45)", color: "white", fontSize: 22 }}>›</button></>}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", gap: 6 }}>{visibleBanners.map((_, index) => <button key={index} type="button" aria-label={`${t.preview} ${index + 1}`} onClick={() => setBannerIndex(index)} style={{ width: index === bannerIndex ? 22 : 8, height: 8, padding: 0, border: 0, borderRadius: 999, background: index === bannerIndex ? "#07c160" : "rgba(255,255,255,.8)" }} />)}</div>
        </div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{visibleBanners.map((url, index) => <div key={`${url}-${index}`}><ImagePreview url={url} alt={`${presentation.banners} ${index + 1}`} height={100} /><button type="button" onClick={() => { setBannerUrls((items) => items.filter((_, i) => i !== index)); setBannersConfirmed(false); }} style={{ marginTop: 5 }}>{t.remove}</button></div>)}</div>
        <input ref={bannersInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={chooseBanners} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton tone="neutral" onClick={() => bannersInput.current?.click()}>{uploading === "banners" ? t.uploading : t.chooseImages}</ActionButton>
          <ActionButton onClick={() => void confirmBanners()}>{bannersConfirmed ? `✓ ${t.bannersConfirmed}` : t.confirmBanners}</ActionButton>
        </div>
        <textarea placeholder={t.urlFallback} value={bannerUrls.join("\n")} onChange={(e) => { setBannerUrls(e.target.value.split(/\n|,/).map((x) => x.trim()).filter(Boolean)); setBannersConfirmed(false); }} rows={4} style={{ padding: 12 }} />
        <small>{t.uploadHint}</small>
      </section>
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}><ActionButton onClick={saveStore}>{t.saveStore}</ActionButton><span>{msg}</span></div>
    </Surface>

    <Surface style={{ marginTop: 18 }}>
      <h2>{presentation.add}</h2>
      <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 14 }}><b style={{ color: "#dc2626" }}>*</b> {requiredText}: {t.name}, {t.price}, và {presentation.image} (chọn ảnh <b>hoặc</b> dán URL). {t.summary} ({optionalText}).</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        <input required aria-label={`${t.name} (${requiredText})`} placeholder={`${t.name} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input aria-label={`${t.summary} (${optionalText})`} placeholder={`${t.summary} (${optionalText})`} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        <input required aria-label={`${t.price} (${requiredText})`} type="number" min="0" placeholder={`${t.price} *`} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        {activeFields.map((field) => field.type === "select" ? <select key={field.key} value={form.extra[field.key] || ""} onChange={(e) => setForm({ ...form, extra: { ...form.extra, [field.key]: e.target.value } })}><option value="">{field.label}</option>{field.options?.map((option) => <option key={option} value={option}>{localizedOption(field.key,option,locale)}</option>)}</select> : <input key={field.key} type={field.type || "text"} placeholder={field.label} value={form.extra[field.key] || ""} onChange={(e) => setForm({ ...form, extra: { ...form.extra, [field.key]: e.target.value } })} />)}
      </div>
      <section style={{ display: "grid", gap: 8, marginTop: 14 }}><b>{presentation.image} <span style={{ color: "#dc2626" }}>* {requiredText}</span> <small>(chọn ảnh hoặc dán URL)</small></b><ImagePreview url={visibleItemImage} alt={form.name || presentation.image} height={180} /><input ref={itemInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={chooseItemImage} /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><ActionButton tone="neutral" onClick={() => itemInput.current?.click()}>{t.chooseImage}</ActionButton>{(form.image || form.imageFile) && <ActionButton tone="neutral" onClick={() => { if (form.imagePreview) URL.revokeObjectURL(form.imagePreview); setForm({ ...form, image: "", imageFile: undefined, imagePreview: undefined }); setItemPreview(""); setItemNotice("Ảnh đã được gỡ khỏi món này."); }}>{t.remove}</ActionButton>}</div><input aria-label={`${t.urlFallback} (${optionalText})`} placeholder={`${t.urlFallback} (${optionalText})`} value={form.image} onChange={(e) => { if (form.imagePreview) URL.revokeObjectURL(form.imagePreview); setItemPreview(""); setForm({ ...form, image: e.target.value, imageFile: undefined, imagePreview: undefined }); setItemNotice(e.target.value.trim() ? "✓ Sẽ dùng URL ảnh này khi lưu danh sách." : ""); }} /></section>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><ActionButton onClick={queueItem}>{queueText}</ActionButton><ActionButton disabled={savingItems || !queuedItems.length} onClick={() => void saveQueuedItems()}>{savingItems ? t.uploading : `${saveQueuedText}${queuedItems.length ? ` (${queuedItems.length})` : ""}`}</ActionButton></div>
      {itemNotice && <p role="status" style={{ margin: "10px 0 0", padding: "10px 12px", borderRadius: 10, background: itemNotice.startsWith("✓") ? "#ecfdf3" : "#fff7ed", color: itemNotice.startsWith("✓") ? "#087a3e" : "#9a3412", fontWeight: 700 }}>{itemNotice}</p>}
      {queuedItems.length > 0 && <div style={{ marginTop: 12, display: "grid", gap: 7 }}>{queuedItems.map((item, index) => <div key={`${item.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "9px 11px", border: "1px solid #dbe4df", borderRadius: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><img src={item.image || item.imagePreview} alt={item.name} style={{ width: 54, height: 54, flex: "0 0 auto", objectFit: "cover", borderRadius: 9, border: "1px solid #dbe4df" }} /><span style={{ minWidth: 0 }}><b>{index + 1}. {item.name}</b><small style={{ display: "block", color: "#64748b", marginTop: 3 }}>Ảnh sẽ tải lên khi lưu danh sách</small><span style={{ display: "block", marginTop: 3 }}>{Number(item.price).toLocaleString("vi-VN")} VND</span></span></div><button type="button" onClick={() => { if (item.imagePreview) URL.revokeObjectURL(item.imagePreview); setQueuedItems((current) => current.filter((_, i) => i !== index)); }}>{t.remove}</button></div>)}</div>}
    </Surface>

    <h2 style={{ marginTop: 24 }}>{presentation.menu}</h2>
    {!items.length ? <p>{t.empty}</p> : <div style={{ display: "grid", gap: 12 }}>{items.map((item) => {
      const imageUrl = String(item.metadata?.imageUrl || "");
      const isAvailable = item.metadata?.isAvailable !== false;
      return <Surface key={item.id} style={{ opacity: isAvailable ? 1 : .72 }}><div style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", gap: 12, alignItems: "center" }}><ItemImage url={imageUrl} alt={item.name || item.id} /><div><b>{item.name || item.id}</b><p>{item.summary}</p><strong>{Number(item.priceFrom || 0).toLocaleString("vi-VN")} VND</strong><small style={{ display: "block", marginTop: 6, color: item.isEnabled ? "#07883f" : "#b45309" }}>{item.isEnabled ? `✓ ${t.synced}` : t.syncHint}</small><small style={{ display: "block", marginTop: 4, fontWeight: 800, color: isAvailable ? "#07883f" : "#dc2626" }}>{isAvailable ? t.available : t.soldOut}</small></div><div style={{ display: "grid", gap: 6 }}><ActionButton tone="neutral" onClick={() => { const price = prompt(t.price, String(item.priceFrom || 0)); if (price !== null) void updateItem(item, { price: Number(price) }); }}>{t.price}</ActionButton><label style={{ cursor: "pointer", padding: "10px 12px", borderRadius: 10, border: "1px solid #dbe4df", textAlign: "center" }}>{uploading === item.id ? t.uploading : t.chooseImage}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => void replaceExistingImage(item, e.target.files?.[0])} /></label>{moduleCode==="food"&&<FoodCommercialEditor serviceId={item.id} metadata={item.metadata} onSaved={()=>void load()}/>}{moduleCode==="housing"&&<><select aria-label="Housing availability" value={String(item.metadata?.housingAvailabilityStatus||"available")} onChange={e=>void updateItem(item,{metadata:{...(item.metadata||{}),housingAvailabilityStatus:e.target.value}})} style={{padding:"9px 10px",borderRadius:10,border:"1px solid #dbe4df",background:"#fff",fontSize:18,fontWeight:800}}><option value="available">{localizedOption("housingAvailabilityStatus","available",locale)}</option><option value="reserved">{localizedOption("housingAvailabilityStatus","reserved",locale)}</option><option value="rented">{localizedOption("housingAvailabilityStatus","rented",locale)}</option></select><label style={{cursor:"pointer",padding:"10px 12px",borderRadius:10,border:"1px solid #dbe4df",textAlign:"center",fontSize:18,fontWeight:800}}>{uploading===`gallery-${item.id}`?t.uploading:t.addGallery}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={e=>void appendHousingGallery(item,e.target.files)}/></label></>}<ActionButton tone={isAvailable ? "danger" : "neutral"} onClick={() => void toggleItemAvailability(item)}>{isAvailable ? t.lockItem : t.unlockItem}</ActionButton><ActionButton tone="danger" onClick={() => void deleteItem(item)}>{t.deleteItem}</ActionButton></div></div>{moduleCode==="housing"&&Array.isArray(item.metadata?.galleryUrls)&&item.metadata.galleryUrls.length>0&&<div style={{marginTop:10}}><small style={{display:"block",color:"#64748b",marginBottom:6}}>{t.housingGallery} · {t.galleryHint}</small><div style={{display:"flex",gap:7,overflowX:"auto"}}>{item.metadata.galleryUrls.filter((x):x is string=>typeof x==="string").map(url=><div key={url} style={{position:"relative",flex:"0 0 82px"}}><img src={url} alt="" style={{width:82,height:62,objectFit:"cover",borderRadius:9}}/><button type="button" onClick={()=>void removeHousingGalleryImage(item,url)} style={{position:"absolute",top:2,right:2,border:0,borderRadius:999,width:20,height:20,background:"rgba(15,23,42,.72)",color:"#fff"}}>×</button></div>)}</div></div>}</Surface>;
    })}</div>}

    <Surface style={{ marginTop: 22, marginBottom: 28, padding: 20, border: "1px solid #b7e7cb", background: "linear-gradient(135deg,#f0fff6,#ffffff)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div><h2 style={{ margin: "0 0 6px" }}>{t.syncServices}</h2><p style={{ margin: 0, color: syncNotice || syncBlockedMessage ? "#9a3412" : "#64748b", fontWeight: syncNotice || syncBlockedMessage ? 700 : 400 }}>{syncNotice || syncBlockedMessage || t.syncHint}</p></div>
        <button type="button" disabled={syncing || Boolean(syncBlockedMessage)} onClick={() => void syncServices()} style={{ minWidth: 220, border: 0, borderRadius: 14, padding: "14px 20px", background: "linear-gradient(135deg,#07c160,#05964a)", color: "white", fontWeight: 900, fontSize: 16, boxShadow: "0 12px 26px rgba(7,193,96,.24)", opacity: syncing || syncBlockedMessage ? .55 : 1, cursor: syncing || syncBlockedMessage ? "not-allowed" : "pointer" }}>{syncing ? t.syncing : `✓ ${t.syncServices}`}</button>
      </div>
    </Surface>
  </main>;
}
