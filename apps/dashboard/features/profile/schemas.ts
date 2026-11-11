import { z } from "zod"

export const MeSchema = z.object({
  id: z.uuidv7(),
  email: z.string(),
  full_name: z.string().nullable(),
  is_active: z.boolean(),
  roles: z.array(z.string()),
})
export type Me = z.infer<typeof MeSchema>
