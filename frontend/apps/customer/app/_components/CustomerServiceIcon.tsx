import Image from "next/image";
import { CustomerIcon } from "./CustomerIcon";
import { getCustomerServicePresentation } from "./customer-service-presentation";

export function CustomerServiceIcon({
  serviceId,
  className,
  size = 48,
}: {
  serviceId?: string;
  className?: string;
  size?: number;
}) {
  const presentation = getCustomerServicePresentation(serviceId);

  if (!presentation.asset) {
    return <CustomerIcon name={presentation.icon} />;
  }

  return (
    <Image
      className={className}
      src={presentation.asset}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
    />
  );
}
