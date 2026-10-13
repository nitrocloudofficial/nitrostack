import { Injectable, ToolDecorator as Tool, UseInterceptors, UsePipes, z } from '@nitrostack/core';
import type { OnModuleInit } from '@nitrostack/core';
import { ulid } from 'ulid';
import { Compensatable } from '../../txn/decorators/compensatable.decorator.js';
import { JournalInterceptor } from '../../txn/interceptors/journal.interceptor.js';
import { JournalCapturePipe } from '../../txn/pipes/journal-capture.pipe.js';
import { CompensatorRegistry } from '../../txn/services/registry.service.js';

interface Message {
  id: string;
  channel: string;
  text: string;
  postedAt: Date;
  deleted: boolean;
  deletedAt: Date | null;
}

interface Invite {
  inviteId: string;
  email: string;
  sentAt: Date;
  revoked: boolean;
}

const PostMessageSchema = z.object({ channel: z.string(), text: z.string() });
const DeleteMessageSchema = z.object({ messageId: z.string() });
const SendEmailSchema = z.object({ to: z.string(), template: z.string() });
const InviteUserSchema = z.object({ email: z.string() });
const RevokeInviteSchema = z.object({ inviteId: z.string() });
const ListMessagesSchema = z.object({ channel: z.string() });

/** In-memory messaging target server: channels/messages and invites, with compensator specs. */
@Injectable({ deps: [CompensatorRegistry] })
export class MessagingTools implements OnModuleInit {
  private readonly channels = new Map<string, Message[]>();
  private readonly messagesById = new Map<string, Message>();
  private readonly invites = new Map<string, Invite>();

  constructor(private readonly registry: CompensatorRegistry) {}

  /** See CrmTools.onModuleInit for why this can't live in a module constructor. */
  onModuleInit(): void {
    this.registry.registerFromClass(this.constructor);
  }

  @Tool({
    name: 'post_message',
    description: 'Post a message to a channel.',
    inputSchema: PostMessageSchema,
  })
  @Compensatable({
    server: 'messaging',
    baseClass: 'TOMBSTONED',
    requiresPreRead: false,
    leavesTrace: true,
    inverse: 'delete_message',
    argsFromOutput: (out) => ({ messageId: (out as { messageId: string }).messageId }),
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async post_message(input: z.infer<typeof PostMessageSchema>) {
    const message: Message = {
      id: `msg_${ulid()}`,
      channel: input.channel,
      text: input.text,
      postedAt: new Date(),
      deleted: false,
      deletedAt: null,
    };
    this.messagesById.set(message.id, message);
    const list = this.channels.get(input.channel) ?? [];
    list.push(message);
    this.channels.set(input.channel, list);
    return { messageId: message.id, channel: message.channel, text: message.text, postedAt: message.postedAt };
  }

  @Tool({
    name: 'delete_message',
    description: 'Delete a message, leaving a visible tombstone. This is the inverse of post_message.',
    inputSchema: DeleteMessageSchema,
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async delete_message(input: z.infer<typeof DeleteMessageSchema>) {
    const message = this.messagesById.get(input.messageId);
    if (message) {
      message.deleted = true;
      message.deletedAt = new Date();
    }
    return { deleted: true, tombstone: '[message deleted]' };
  }

  @Tool({
    name: 'send_email',
    description: 'Send an email. Cannot be undone — only counteracted by a retraction email within a short window.',
    inputSchema: SendEmailSchema,
  })
  @Compensatable({
    server: 'messaging',
    baseClass: 'MITIGABLE',
    requiresPreRead: false,
    counteractionOnly: true,
    inverse: 'send_email',
    argsFromOutput: (_out, i) => {
      const input = i as z.infer<typeof SendEmailSchema>;
      return { to: input.to, template: 'retraction', originalTemplate: input.template };
    },
    window: 5 * 60 * 1000,
    decaysTo: 'TERMINAL',
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async send_email(input: z.infer<typeof SendEmailSchema>) {
    return { messageId: `email_${ulid()}`, to: input.to, template: input.template, sentAt: new Date() };
  }

  @Tool({
    name: 'invite_user',
    description: 'Send an invite to a user by email.',
    inputSchema: InviteUserSchema,
  })
  @Compensatable({
    server: 'messaging',
    baseClass: 'TOMBSTONED',
    requiresPreRead: false,
    leavesTrace: true,
    inverse: 'revoke_invite',
    argsFromOutput: (out) => ({ inviteId: (out as { inviteId: string }).inviteId }),
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async invite_user(input: z.infer<typeof InviteUserSchema>) {
    const invite: Invite = { inviteId: `inv_${ulid()}`, email: input.email, sentAt: new Date(), revoked: false };
    this.invites.set(invite.inviteId, invite);
    return { inviteId: invite.inviteId, email: invite.email, sentAt: invite.sentAt };
  }

  @Tool({
    name: 'revoke_invite',
    description: 'Revoke a pending invite. No compensator — this is the inverse of invite_user.',
    inputSchema: RevokeInviteSchema,
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async revoke_invite(input: z.infer<typeof RevokeInviteSchema>) {
    const invite = this.invites.get(input.inviteId);
    if (invite) invite.revoked = true;
    return { revoked: true };
  }

  @Tool({
    name: 'list_messages',
    description: 'List all messages in a channel, including tombstoned ones. Used for demo proof.',
    inputSchema: ListMessagesSchema,
  })
  async list_messages(input: z.infer<typeof ListMessagesSchema>) {
    return this.channels.get(input.channel) ?? [];
  }
}
