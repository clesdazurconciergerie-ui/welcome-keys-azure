import { Link,useParams } from "react-router-dom";
import { InvoiceOwnerDeliveryPanel } from "@/components/finance/InvoiceOwnerDeliveryPanel";
export default function InvoiceOwnerPublicationPage(){
  const {invoiceId}=useParams();
  return <div className="max-w-5xl space-y-6"><Link to="/dashboard/finance">Retour à Finance</Link>{invoiceId && <InvoiceOwnerDeliveryPanel invoiceId={invoiceId}/>}</div>;
}
