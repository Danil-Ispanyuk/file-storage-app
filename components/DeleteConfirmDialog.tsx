"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DeleteConfirmDialogProps = {
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
};

export function DeleteConfirmDialog({
  fileName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4">
          <h2 className="text-destructive text-lg font-semibold">
            Delete File
          </h2>
        </div>

        <div className="mb-6 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to delete this file?
          </p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            &quot;{fileName}&quot;
          </p>
          <p className="text-destructive text-xs">
            ⚠️ This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={isDeleting}
            className="text-destructive border-destructive hover:bg-destructive hover:text-white"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
