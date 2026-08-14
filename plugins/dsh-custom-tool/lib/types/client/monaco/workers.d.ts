/**
 * Worker URL for one Monaco worker label.
 * @param label - the Monaco worker label ('typescript' | 'javascript' | others).
 * @returns a blob URL for the matching inline worker source.
 */
export declare function getWorkerUrl(label: string): string;
