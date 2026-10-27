import React, { useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const TOPICS = [
  {
    title: "Record a sale",
    body: "Open Sales, add the products and quantities, then save the payment as cash or bank.",
  },
  {
    title: "See profit",
    body: "Home and Reports show revenue, cost of sales, gross profit, expenses, and net profit.",
  },
  {
    title: "Share the shop",
    body: "Open Storefront, turn the shop on, and copy the link. Customers can browse and pay with Squad.",
  },
  {
    title: "Add staff",
    body: "Open Team and invite someone with the access they need. Owners can see every part of the shop.",
  },
];

const SupportPage = () => {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [activeId, setActiveId] = useState(null);

  const tickets = useQuery("support-tickets", () => api.support.list(), {
    refetchOnWindowFocus: false,
  });
  const thread = useQuery(
    ["support-ticket", activeId],
    () => api.support.get(activeId),
    { enabled: Boolean(activeId), refetchOnWindowFocus: false }
  );

  const createTicket = useMutation((data) => api.support.create(data), {
    onSuccess: (response) => {
      toast.success(response.message || "Message sent.");
      setSubject("");
      setMessage("");
      setActiveId(response.data?.id || null);
      queryClient.invalidateQueries("support-tickets");
    },
    onError: (error) => toast.error(error.message || "Could not send your message."),
  });

  const sendReply = useMutation(
    (text) => api.support.reply(activeId, text),
    {
      onSuccess: () => {
        setReply("");
        queryClient.invalidateQueries(["support-ticket", activeId]);
        queryClient.invalidateQueries("support-tickets");
      },
      onError: (error) => toast.error(error.message || "Could not send your message."),
    }
  );

  const closeTicket = useMutation(() => api.support.close(activeId), {
    onSuccess: () => {
      queryClient.invalidateQueries(["support-ticket", activeId]);
      queryClient.invalidateQueries("support-tickets");
    },
  });

  const items = tickets.data?.data?.items || [];
  const messages = thread.data?.data?.messages || [];
  const current = thread.data?.data?.ticket;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <LifeBuoy className="w-7 h-7 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Answers for common tasks, or a message to the Sakora team.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">Common questions</h2>
          <div className="space-y-2">
            {TOPICS.map((topic) => (
              <details key={topic.title} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                  {topic.title}
                </summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{topic.body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">Write to Sakora</h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createTicket.mutate({ subject, message });
            }}
          >
            <input
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
              placeholder="Subject"
              value={subject}
              maxLength={160}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
            <textarea
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-28 text-gray-900 dark:text-white"
              placeholder="What do you need help with?"
              value={message}
              maxLength={4000}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
            <button
              type="submit"
              disabled={createTicket.isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 text-white px-4 py-2 font-semibold disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {createTicket.isLoading ? "Sending…" : "Send"}
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">Your requests</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 ${
                      activeId === item.id
                        ? "border-teal-600 bg-teal-50 dark:bg-teal-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <span className="block font-semibold text-gray-900 dark:text-white">
                      {item.subject}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{item.status}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div>
              {!current ? (
                <p className="text-sm text-gray-500">Choose a request to read it.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white">{current.subject}</h3>
                    {current.status === "open" ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-gray-500"
                        onClick={() => closeTicket.mutate()}
                      >
                        Close
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    {messages.map((entry) => (
                      <article
                        key={entry.id}
                        className={`rounded-xl px-3 py-2 text-sm ${
                          entry.author === "support"
                            ? "bg-teal-50 dark:bg-teal-900/30"
                            : "bg-gray-100 dark:bg-gray-900"
                        }`}
                      >
                        <p className="font-semibold text-gray-900 dark:text-white">{entry.name}</p>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.body}</p>
                      </article>
                    ))}
                  </div>
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendReply.mutate(reply);
                    }}
                  >
                    <input
                      className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                      placeholder="Add a message"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={sendReply.isLoading}
                      className="rounded-full bg-teal-600 text-white px-4 py-2 font-semibold disabled:opacity-60"
                    >
                      Send
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SupportPage;
