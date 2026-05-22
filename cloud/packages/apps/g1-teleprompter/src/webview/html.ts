const prodHtmlUrl = new URL('./index.prod.html', import.meta.url);

export async function getProdHtml(): Promise<string> {
  return await Bun.file(prodHtmlUrl).text();
}
