/**
 * Browser stand-in for `ajv/dist/2020.js` (aliased in apps/dashboard and apps/web next.config.ts). @bible-strong/avatar-core validates Wappi's
 * character with Ajv, which compiles schemas through `new Function` and our CSP has no `unsafe-eval`, so the avatar
 * crashed in production. The character is our own file (wappi.avatar.json) and a test checks it with the
 * real Ajv in Node (apps/dashboard/lib/__tests__/ajv-browser.test.ts).
 * shortcut: accepts any data, fine while the only browser user validates a bundled file; revisit if user-supplied
 * data ever goes through avatar-core or another Ajv consumer reaches the client bundle.
 */
type Validate = ((data: unknown) => boolean) & { errors: null }

export class Ajv2020 {
  constructor(_options?: object) {}

  compile(_schema: object): Validate {
    return Object.assign(() => true, { errors: null })
  }
}
