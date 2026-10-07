/** Renders `{{token}}` placeholders in a message template body. */
export function renderTemplate(body: string, tokens: Record<string, string>) {
  return body.replace(/{{\s*(\w+)\s*}}/g, (match, key) => tokens[key] ?? match)
}
