"use client";

export function PrintBriefButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <button className="button export-button print-hidden" onClick={handlePrint} type="button">
      Export / Print Brief
    </button>
  );
}
