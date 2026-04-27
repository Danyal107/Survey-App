import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnalyticsDashboard surveyId={id} />;
}
