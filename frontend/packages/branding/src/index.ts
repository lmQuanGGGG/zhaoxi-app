export const brand = {
  nameZh: "赵喜",
  fullNameZh: "赵喜 · 岘港华人生活服务平台",
  nameVi: "Triệu Hỷ",
  fullNameVi: "Triệu Hỷ · Cuộc sống Người Hoa tại Đà Nẵng",
  sloganZh: "让在岘港生活更简单",
  sloganVi: "Giúp cuộc sống tại Đà Nẵng trở nên đơn giản hơn",
  cityZh: "越南岘港",
  cityVi: "Thành phố Đà Nẵng",
} as const;

export type ServiceModuleId =
  | "food" | "housing" | "visa" | "car-rental" | "translation"
  | "travel" | "payment" | "community" | "market" | "emergency";

export type ServiceModule = {
  id: ServiceModuleId;
  icon: string;
  zh: string;
  vi: string;
  description: string;
  customerHref: string;
  partnerHref?: string;
  priority: "core" | "growth" | "support";
};

export const serviceModules: readonly ServiceModule[] = [
  { id:"food", icon:"🍜", zh:"外卖订餐", vi:"Đặt món", description:"Nhà hàng Trung–Việt, thực đơn tiếng Trung và theo dõi đơn.", customerHref:"/services/food", partnerHref:"/nha-hang", priority:"core" },
  { id:"housing", icon:"🏠", zh:"岘港租房", vi:"Thuê nhà", description:"Căn hộ, villa, nhà nguyên căn và lịch hẹn xem nhà.", customerHref:"/thue-nha", partnerHref:"/doi-tac/nha-o", priority:"core" },
  { id:"visa", icon:"🛂", zh:"护照签证", vi:"Hộ chiếu – thị thực", description:"Gia hạn thị thực, tạm trú, giấy phép lao động và dịch vụ hồ sơ.", customerHref:"/ho-chieu-thi-thuc", partnerHref:"/doi-tac/ho-so", priority:"core" },
  { id:"car-rental", icon:"🚗", zh:"租车服务", vi:"Thuê xe", description:"Xe máy, ô tô, xe sân bay, thuê theo ngày hoặc theo tháng.", customerHref:"/thue-xe", partnerHref:"/doi-tac/thue-xe", priority:"core" },
  { id:"translation", icon:"🗣️", zh:"翻译服务", vi:"Phiên dịch", description:"Bệnh viện, ngân hàng, công chứng, doanh nghiệp và hỗ trợ khẩn.", customerHref:"/phien-dich", partnerHref:"/doi-tac/phien-dich", priority:"growth" },
  { id:"travel", icon:"🏝️", zh:"旅游服务", vi:"Du lịch", description:"Tour, vé tham quan, xe đưa đón và hướng dẫn viên tiếng Trung.", customerHref:"/du-lich", partnerHref:"/doi-tac/du-lich", priority:"growth" },
  { id:"payment", icon:"💳", zh:"支付服务", vi:"Thanh toán", description:"QR ngân hàng Việt Nam, chuyển khoản và thanh toán khi nhận.", customerHref:"/thanh-toan", priority:"support" },
  { id:"community", icon:"👥", zh:"华人社区", vi:"Cộng đồng", description:"Tin tức, việc làm, mua bán, hỏi đáp và sự kiện tại Đà Nẵng.", customerHref:"/cong-dong", priority:"growth" },
  { id:"market", icon:"🛍️", zh:"华人商城", vi:"Chợ Người Hoa", description:"Gia vị, đồ ăn vặt, mỹ phẩm, đồ gia dụng và hàng nhập khẩu.", customerHref:"/cho-trung-quoc", partnerHref:"/doi-tac/cua-hang", priority:"growth" },
  { id:"emergency", icon:"🆘", zh:"紧急帮助", vi:"Hỗ trợ khẩn cấp", description:"Bệnh viện, công an, cứu hộ, phiên dịch và liên hệ hỗ trợ.", customerHref:"/khan-cap", priority:"support" },
] as const;
