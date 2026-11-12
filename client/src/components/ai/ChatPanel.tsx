import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronLeft,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import MarkdownAnswer from '@/components/ai/MarkdownAnswer';
import DocumentSelect from '@/components/ai/DocumentSelect';
import useAiDocuments from '@/components/ai/useAiDocuments';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import {
  createConversation,
  deleteConversation,
  fetchConversations,
  fetchMessages,
  renameConversation,
  sendChatMessage,
} from '@/services/aiService';
import type { AiConversation, AiMessage } from '@/types/ai';

const SUGGESTIONS = [
  'Explain Binary Search Tree with an example.',
  'Summarise the important points of the uploaded unit.',
  'What is the difference between a process and a thread?',
  'Solve: find the time complexity of merge sort.',
];

/** ChatGPT-style study assistant backed by the RAG endpoints. */
export default function ChatPanel() {
  const { notify } = useToast();
  const { documents, upload, remove, uploading, progress } = useAiDocuments();

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [showList, setShowList] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await fetchConversations());
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Could not load your chats.'));
    } finally {
      setLoadingList(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    setShowList(false);
    setLoadingThread(true);
    try {
      const thread = await fetchMessages(id);
      setMessages(thread.messages);
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Could not open that conversation.'));
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput('');
    setShowList(false);
    textareaRef.current?.focus();
  };

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const optimistic: AiMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setSending(true);

    try {
      let conversationId = activeId;
      if (!conversationId) {
        const created = await createConversation({
          title: content.slice(0, 60),
          document_id: documentId || null,
        });
        conversationId = created.id;
        setActiveId(created.id);
        setConversations((prev) => [created, ...prev]);
      }
      const result = await sendChatMessage(conversationId, content, documentId || null);
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== optimistic.id),
        result.user_message,
        result.assistant_message,
      ]);
      setConversations((prev) => [
        result.conversation,
        ...prev.filter((conversation) => conversation.id !== result.conversation.id),
      ]);
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== optimistic.id));
      setInput(content);
      notify('error', apiErrorMessage(error, 'The assistant could not answer that.'));
    } finally {
      setSending(false);
    }
  };

  const saveTitle = async (id: string) => {
    const title = titleDraft.trim();
    setEditingId(null);
    if (!title) return;
    try {
      const updated = await renameConversation(id, title);
      setConversations((prev) =>
        prev.map((conversation) => (conversation.id === id ? updated : conversation)),
      );
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Could not rename that chat.'));
    }
  };

  const removeConversation = async (id: string) => {
    if (!window.confirm('Delete this conversation and its messages?')) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((conversation) => conversation.id !== id));
      if (activeId === id) startNewChat();
      notify('success', 'Conversation deleted.');
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Could not delete that conversation.'));
    }
  };

  const conversationList = (
    <div className="flex h-full flex-col">
      <button type="button" className="btn-primary w-full" onClick={startNewChat}>
        <MessageSquarePlus className="h-4 w-4" /> New chat
      </button>
      <div className="mt-3 flex-1 space-y-1 overflow-y-auto scrollbar-thin pr-1">
        {loadingList && (
          <p className="px-2 py-3 text-xs text-slate-500">Loading your chats…</p>
        )}
        {!loadingList && conversations.length === 0 && (
          <p className="px-2 py-3 text-xs text-slate-500">
            No conversations yet. Ask your first question to start one.
          </p>
        )}
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition ${
              conversation.id === activeId
                ? 'bg-primary-50 text-primary-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {editingId === conversation.id ? (
              <div className="flex flex-1 items-center gap-1">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void saveTitle(conversation.id);
                    if (event.key === 'Escape') setEditingId(null);
                  }}
                  className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Save title"
                  onClick={() => void saveTitle(conversation.id)}
                  className="text-emerald-600"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void openConversation(conversation.id)}
                  className="flex-1 truncate text-left text-[13px] font-medium"
                  title={conversation.title}
                >
                  {conversation.title}
                </button>
                <button
                  type="button"
                  aria-label="Rename chat"
                  className="text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-slate-700"
                  onClick={() => {
                    setEditingId(conversation.id);
                    setTitleDraft(conversation.title);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete chat"
                  className="text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-error-600"
                  onClick={() => void removeConversation(conversation.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="card hidden p-3 lg:block lg:h-[640px]">{conversationList}</aside>

      <section className="card flex h-[640px] flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost px-2 py-1 lg:hidden"
              onClick={() => setShowList(true)}
              aria-label="Open chat list"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {conversations.find((conversation) => conversation.id === activeId)?.title ||
                  'New conversation'}
              </p>
              <p className="text-[11px] text-slate-500">
                Answers are grounded in the document you attach.
              </p>
            </div>
          </div>
          <span className="badge bg-primary-50 text-primary-700">AI Assistant</span>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
          {loadingThread && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading messages…
            </p>
          )}

          {!loadingThread && messages.length === 0 && (
            <div className="mx-auto max-w-lg py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Ask anything from your syllabus
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Attach a PDF for document-based answers with page references, or ask a general
                engineering question.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-primary-300 hover:bg-primary-50/40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-600 px-4 py-2.5 text-sm text-white shadow-sm">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            ) : (
              <div key={message.id} className="group flex gap-2">
                <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <MarkdownAnswer content={message.content} />
                  {message.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                      {message.citations.map((citation, index) => (
                        <span
                          key={`${message.id}-citation-${index}`}
                          title={citation.snippet}
                          className="badge bg-slate-100 text-slate-600"
                        >
                          {citation.document_name ? `${citation.document_name} · ` : ''}
                          {citation.page ? `p. ${citation.page}` : 'source'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Bot className="h-4 w-4" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                Thinking…
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <footer className="border-t border-slate-200 bg-slate-50/60 px-4 py-3">
          <div className="mb-2">
            <DocumentSelect
              documents={documents}
              value={documentId}
              onChange={setDocumentId}
              label="Answer from document"
              allowUpload
              onUpload={upload}
              onDelete={remove}
              uploading={uploading}
              progress={progress}
              hint="Optional. With a PDF attached, answers cite the relevant pages."
            />
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask a question… (Enter to send, Shift+Enter for a new line)"
              className="input-field max-h-32 min-h-[46px] flex-1 resize-y"
            />
            <button
              type="button"
              className="btn-primary h-[46px] px-4"
              onClick={() => void send()}
              disabled={sending || !input.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </footer>
      </section>

      {showList && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowList(false)} />
          <div className="relative z-10 h-full w-72 max-w-[80%] bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Your chats</p>
              <button
                type="button"
                className="btn-ghost px-2 py-1"
                onClick={() => setShowList(false)}
                aria-label="Close chat list"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {conversationList}
          </div>
        </div>
      )}
    </div>
  );
}
