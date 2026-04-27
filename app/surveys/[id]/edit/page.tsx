import { SurveyBuilder } from "@/components/SurveyBuilder";

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SurveyBuilder surveyId={id} />;
}
