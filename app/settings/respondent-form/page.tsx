import { AdminGate } from "@/components/AdminGate";
import { RespondentFormEditor } from "@/components/RespondentFormEditor";

export default function RespondentFormSettingsPage() {
  return (
    <AdminGate>
      <RespondentFormEditor />
    </AdminGate>
  );
}
