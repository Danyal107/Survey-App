import { AdminGate } from "@/components/AdminGate";
import { SurveyBuilder } from "@/components/SurveyBuilder";

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminGate>
      <SurveyBuilder surveyId={id} />
    </AdminGate>
  );
}
