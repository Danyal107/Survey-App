import { TakeSurveyForm } from "@/components/TakeSurveyForm";

export default async function TakeSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TakeSurveyForm surveyId={id} />;
}
