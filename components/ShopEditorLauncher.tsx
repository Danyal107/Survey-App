"use client";

import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { ShopAdminPanel } from "@/components/ShopAdminPanel";
import type { IShopDetails } from "@/models/Shop";
import type { RespondentFieldDef } from "@/types/respondentForm";

type Props = {
  shopId: string;
  fields: RespondentFieldDef[];
  initialDetails: IShopDetails;
  initialCoordinates: [number, number] | null;
  panelKey: string;
};

export function ShopEditorLauncher({
  shopId,
  fields,
  initialDetails,
  initialCoordinates,
  panelKey,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mt-8">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen(true)}
        >
          Edit shop
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Unlock below to edit. Use <strong className="text-zinc-300">Close editor</strong>{" "}
        (fixed above the dialog) to exit without saving.
      </p>
      <button
        type="button"
        className="btn-ghost fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 shadow-lg ring-1 ring-[var(--border)] sm:left-auto sm:right-6 sm:translate-x-0"
        onClick={() => setOpen(false)}
      >
        Close editor
      </button>
      <AdminGate>
        <ShopAdminPanel
          key={panelKey}
          shopId={shopId}
          fields={fields}
          initialDetails={initialDetails}
          initialCoordinates={initialCoordinates}
          onClose={() => setOpen(false)}
        />
      </AdminGate>
    </div>
  );
}
