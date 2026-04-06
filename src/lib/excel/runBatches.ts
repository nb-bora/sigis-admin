/**
 * Exécute une tâche async sur chaque élément par lots avec `Promise.all` dans chaque lot
 * (évite trop de requêtes simultanées tout en gardant un débit correct).
 */
export async function runInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const bs = Math.max(1, batchSize);
  for (let i = 0; i < items.length; i += bs) {
    const slice = items.slice(i, i + bs);
    await Promise.all(slice.map((item, j) => worker(item, i + j)));
  }
}
