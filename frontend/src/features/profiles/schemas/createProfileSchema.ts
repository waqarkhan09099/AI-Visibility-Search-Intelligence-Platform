import { z } from 'zod'

export const createProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(
      /^(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Invalid domain format',
    ),
  industry: z.string().min(1, 'Industry is required'),
  description: z.string().max(500, 'Description must be 500 characters or less'),
  competitors: z
    .array(z.string().min(1, 'Competitor name cannot be empty'))
    .max(10, 'Maximum 10 competitors'),
})

export type CreateProfileFormValues = z.infer<typeof createProfileSchema>
