"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useState } from "react";

// Configure PDF.js worker - use local worker file from public directory
if (typeof window !== "undefined") {
  // Use the worker from public directory (copied from pdfjs-dist)
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

type PDFViewerProps = {
  fileUrl: string;
  fileName: string | null;
  permission: "READ" | "READ_WRITE" | null;
  token: string;
  fileId?: string; // For download when token is not available
};

export function PDFViewer({
  fileUrl,
  fileName,
  permission,
  token,
  fileId,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
          disabled={pageNumber <= 1}
          className="rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {pageNumber} of {numPages || "?"}
        </span>
        <button
          onClick={() =>
            setPageNumber((prev) =>
              numPages ? Math.min(numPages, prev + 1) : prev,
            )
          }
          disabled={!numPages || pageNumber >= numPages}
          className="rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
        {permission === "READ_WRITE" && token && (
          <a
            href={`/api/files/shared/${token}?download=true`}
            className="text-primary hover:text-primary/80 ml-4 text-sm font-medium"
            download={fileName || undefined}
          >
            Download PDF
          </a>
        )}
        {permission === "READ_WRITE" && !token && fileId && (
          <a
            href={`/api/files/${fileId}/download`}
            className="text-primary hover:text-primary/80 ml-4 text-sm font-medium"
            download={fileName || undefined}
          >
            Download PDF
          </a>
        )}
        {permission === "READ" && (
          <span className="text-muted-foreground ml-4 text-xs">
            Read Only - Download not available
          </span>
        )}
      </div>
      <div className="flex max-h-[calc(100vh-150px)] justify-center overflow-auto rounded border bg-gray-200 p-4 dark:bg-gray-800">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
          }}
          onLoadError={(error) => {
            console.error("PDF load error:", error);
            setError("Failed to load PDF file");
            setPdfLoading(false);
          }}
          loading={
            <div className="py-8 text-center">
              <div className="relative mx-auto mb-4 h-12 w-12">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                <div className="border-t-primary absolute inset-0 animate-spin rounded-full border-4 border-transparent"></div>
              </div>
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          }
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            className="shadow-lg"
            scale={1.0}
          />
        </Document>
      </div>
      {error && (
        <div className="mt-4 text-center">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
