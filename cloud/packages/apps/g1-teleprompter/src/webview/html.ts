const prodHtmlUrl = new URL('./index.prod.html', import.meta.url);
const distDirUrl = new URL('./dist/', import.meta.url);

export async function getProdHtml(): Promise<string> {
  return await Bun.file(prodHtmlUrl).text();
}

export function getProdAsset(name: string): Bun.BunFile {
  return Bun.file(new URL(name, distDirUrl));
}
