import { prisma } from "@/lib/db";

/**
 * Notification adapter. In-app notifications are persisted; email/SMS/push are
 * routed through a sink that's a no-op console logger in dev. Drop in SMTP /
 * Twilio / web-push later by implementing ChannelSink.
 */

export interface ChannelSink {
  send(to: string, title: string, body: string): Promise<void>;
}

const consoleSink: ChannelSink = {
  async send(to, title, body) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[notify] → ${to}: ${title} — ${body}`);
    }
  },
};

export async function notifyUser(userId: string, title: string, body: string): Promise<void> {
  await prisma.notification.create({ data: { userId, title, body } });
}

export async function sendEmail(to: string, title: string, body: string): Promise<void> {
  await consoleSink.send(to, title, body);
}
