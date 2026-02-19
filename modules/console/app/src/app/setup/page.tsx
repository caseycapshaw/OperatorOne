import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/setup";
import { SetupWizard } from "@/components/setup/SetupWizard";

export default async function SetupPage() {
  const complete = await isSetupComplete();
  if (complete) redirect("/");

  return <SetupWizard />;
}
