import { redirect } from "next/navigation";

/** Las citas reemplazan la vista de leads en el producto de agendamiento. */
export default function LeadsRedirectPage() {
  redirect("/citas");
}
