// Always fetch live data from the runtime database — never serve a
// statically-generated snapshot baked in at build time.
export const dynamic = "force-dynamic";

import { getProjects } from "@/lib/projects";
import { LandingPageClient } from "@/components/landing/LandingPageClient";

export default async function LandingPage() {
  const projects = await getProjects();

  return <LandingPageClient projects={projects} />;
}
