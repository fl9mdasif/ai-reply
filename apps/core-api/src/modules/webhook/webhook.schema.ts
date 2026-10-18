import { z } from 'zod';

// Deliberately loose: Meta's payload carries many fields we don't use yet
// (M5 will read message.text more carefully). We only validate the shape
// webhook.service.ts actually reads.
const messagingEventSchema = z.object({
  sender: z.object({ id: z.string() }).optional(),
  message: z
    .object({
      mid: z.string().optional(),
      text: z.string().optional(),
      is_echo: z.boolean().optional(),
    })
    .optional(),
  delivery: z.unknown().optional(),
  read: z.unknown().optional(),
});
export type MessagingEvent = z.infer<typeof messagingEventSchema>;

const webhookEntrySchema = z.object({
  id: z.string(),
  messaging: z.array(messagingEventSchema).optional(),
});
export type WebhookEntry = z.infer<typeof webhookEntrySchema>;

export const webhookPayloadSchema = z.object({
  object: z.string().optional(),
  entry: z.array(webhookEntrySchema).default([]),
});
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
