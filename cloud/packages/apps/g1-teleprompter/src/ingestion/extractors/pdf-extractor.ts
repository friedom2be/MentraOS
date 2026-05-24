import pdf from 'pdf-parse';

export async function extractFromPdf(
  bytes: ArrayBuffer | Uint8Array,
  title = 'Imported PDF',
): Promise<{title: string; text: string}> {
  const byteView = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buffer = Buffer.isBuffer(byteView) ? byteView : Buffer.from(byteView);
  const parsed = await pdf(buffer);
  const text = parsed.text.trim();

  if (!text) {
    throw new Error('Unable to extract text from PDF');
  }

  return {
    title: parsed.info?.Title || title,
    text,
  };
}
