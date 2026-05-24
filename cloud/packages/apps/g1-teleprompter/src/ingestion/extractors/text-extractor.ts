export async function extractFromText(text: string, title = 'Pasted Text'): Promise<{title: string; text: string}> {
  return {
    title,
    text: text.trim(),
  };
}
