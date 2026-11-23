const pendingLayers = '[data-print-pending="true"]';

export function waitForPrintLayers(root: Element, signal: AbortSignal): Promise<void> {
  if (signal.aborted || !root.querySelector(pendingLayers)) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => {
      observer.disconnect();
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (!root.querySelector(pendingLayers)) finish();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-print-pending"], childList: true, subtree: true });
    signal.addEventListener("abort", finish, { once: true });
  });
}
