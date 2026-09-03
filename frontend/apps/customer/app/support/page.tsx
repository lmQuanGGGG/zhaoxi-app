"use client";
import {useSearchParams} from "next/navigation";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {SupportCenter} from "@zhaoxi/support";
import {CustomerPageHeader,CustomerShell} from "../_components/CustomerShell";
import styles from "./support.module.css";

const topicCopy={
"zh-CN":{
 back:"消息",medical:{title:"医疗急救",guide:"如遇严重或危及生命的情况，请优先联系当地急救服务，并尽量提供您的位置、症状和联系电话。",prompt:"我需要医疗急救帮助。"},
 police:{title:"报警与证件遗失",guide:"请准备发生地点、时间、证件类型和可联系号码。赵喜可以帮助整理沟通内容。",prompt:"我需要报警或证件遗失帮助。"},
 road:{title:"道路救援与事故",guide:"请提供当前位置、车辆情况以及是否有人受伤。涉及人身安全时请优先联系当地紧急服务。",prompt:"我需要道路救援或事故帮助。"},
 consular:{title:"领事协助",guide:"请准备姓名、国籍、证件情况和当前所在位置，以便赵喜协助整理信息。",prompt:"我需要领事协助。"},
 service:{title:"服务咨询",guide:"告诉赵喜您想找的服务、位置、预算和时间，我们会先提供基础建议。",prompt:"我需要生活服务咨询。"}
},
"zh-TW":{
 back:"訊息",medical:{title:"醫療急救",guide:"如遇嚴重或危及生命的情況，請優先聯絡當地急救服務，並盡量提供位置、症狀和聯絡電話。",prompt:"我需要醫療急救協助。"},
 police:{title:"報警與證件遺失",guide:"請準備發生地點、時間、證件類型和可聯絡號碼。趙喜可以協助整理溝通內容。",prompt:"我需要報警或證件遺失協助。"},
 road:{title:"道路救援與事故",guide:"請提供目前位置、車輛情況以及是否有人受傷。涉及人身安全時請優先聯絡當地緊急服務。",prompt:"我需要道路救援或事故協助。"},
 consular:{title:"領事協助",guide:"請準備姓名、國籍、證件情況和目前位置，以便趙喜協助整理資訊。",prompt:"我需要領事協助。"},
 service:{title:"服務諮詢",guide:"告訴趙喜您需要的服務、位置、預算和時間，我們會先提供基礎建議。",prompt:"我需要生活服務諮詢。"}
},
"vi-VN":{
 back:"Tin nhắn",medical:{title:"Cấp cứu y tế",guide:"Nếu tình huống nghiêm trọng hoặc đe dọa tính mạng, hãy ưu tiên liên hệ dịch vụ cấp cứu địa phương và cung cấp vị trí, triệu chứng cùng số liên hệ.",prompt:"Tôi cần hỗ trợ cấp cứu y tế."},
 police:{title:"Công an và mất giấy tờ",guide:"Hãy chuẩn bị địa điểm, thời gian xảy ra sự việc, loại giấy tờ và số điện thoại có thể liên hệ. ZhaoXi có thể giúp bạn chuẩn bị nội dung trao đổi.",prompt:"Tôi cần hỗ trợ công an hoặc mất giấy tờ."},
 road:{title:"Cứu hộ xe và tai nạn",guide:"Hãy cung cấp vị trí hiện tại, tình trạng phương tiện và cho biết có người bị thương hay không. Nếu có nguy hiểm đến con người, hãy ưu tiên dịch vụ khẩn cấp địa phương.",prompt:"Tôi cần cứu hộ xe hoặc hỗ trợ tai nạn."},
 consular:{title:"Hỗ trợ lãnh sự",guide:"Hãy chuẩn bị họ tên, quốc tịch, tình trạng giấy tờ và vị trí hiện tại để ZhaoXi hỗ trợ sắp xếp thông tin.",prompt:"Tôi cần hỗ trợ lãnh sự."},
 service:{title:"Tư vấn dịch vụ",guide:"Hãy cho ZhaoXi biết dịch vụ cần tìm, vị trí, ngân sách và thời gian. Trợ lý sẽ cung cấp hướng dẫn cơ bản trước.",prompt:"Tôi cần tư vấn dịch vụ đời sống."}
},
"en-US":{
 back:"Messages",medical:{title:"Medical emergency",guide:"If the situation is serious or life-threatening, contact local emergency services first and provide your location, symptoms, and contact number.",prompt:"I need medical emergency help."},
 police:{title:"Police and lost documents",guide:"Prepare the location, time, document type, and a reachable phone number. ZhaoXi can help organize what you need to communicate.",prompt:"I need police or lost-document help."},
 road:{title:"Roadside rescue and accidents",guide:"Provide your current location, vehicle condition, and whether anyone is injured. Prioritize local emergency services if personal safety is at risk.",prompt:"I need roadside or accident help."},
 consular:{title:"Consular assistance",guide:"Prepare your name, nationality, document status, and current location so ZhaoXi can help organize the information.",prompt:"I need consular assistance."},
 service:{title:"Service advice",guide:"Tell ZhaoXi the service you need, location, budget, and timing. The Assistant will provide basic guidance first.",prompt:"I need life-service advice."}
}} as const;

export default function Page(){
 const{locale}=useZhaoXiLocale();const q=useSearchParams();const raw=q.get("topic")||"service";type Topic="medical"|"police"|"road"|"consular"|"service";const allowed:Topic[]=["medical","police","road","consular","service"];const topic:Topic=allowed.includes(raw as Topic)?raw as Topic:"service";const row=topicCopy[locale][topic];const searchQuery=(q.get("query")||"").trim();const conversationId=(q.get("conversation")||"").trim();const initialPrompt=searchQuery?`${row.prompt} ${searchQuery}`:row.prompt;
 return <CustomerShell><CustomerPageHeader title={row.title} backHref="/messages"/><section className={styles.guidance}><b>{row.title}</b><p>{row.guide}</p></section><section className={styles.assistant}><SupportCenter role="customer" initialPrompt={conversationId?undefined:initialPrompt} initialConversationId={conversationId||undefined}/></section></CustomerShell>
}
