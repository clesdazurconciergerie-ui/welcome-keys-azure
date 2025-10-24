import { useParams } from "react-router-dom";
import BookletWizard from "@/components/BookletWizard";

export default function BookletWizardPage() {
  const { id } = useParams();
  
  return <BookletWizard bookletId={id} />;
}
