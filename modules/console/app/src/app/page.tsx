import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSetupMode } from "@/lib/setup";

export default async function Home() {
  const setupMode = await isSetupMode();
  if (setupMode) redirect("/setup");

  const session = await auth();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
