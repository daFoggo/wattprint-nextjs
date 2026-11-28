/** The message key of a backend id: "home numbers" → "homeNumbers". */
export const sentKey = (id: string) =>
  id.replace(/ (\w)/g, (_, c: string) => c.toUpperCase())
