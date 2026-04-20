/**
 * Get Document Width utility
 * @name getDocumentWidth
 * @description Utility function that is used to return the width of the document.
 */

export function getDocumentWidth() {
  return Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    document.body.offsetWidth,
    document.documentElement.offsetWidth,
    document.body.clientWidth,
    document.documentElement.clientWidth,
  );
}

