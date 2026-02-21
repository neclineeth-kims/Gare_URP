import { getProjects } from "@/lib/projects";
import { LandingPageClient } from "@/components/landing/LandingPageClient";

export default async function LandingPage() {
  const projects = getProjects();

  return <LandingPageClient projects={projects} />;
}
