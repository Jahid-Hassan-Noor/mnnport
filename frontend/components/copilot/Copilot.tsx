"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, X, ChevronDown, Check, Pencil, Ban } from "lucide-react";
import { PROMPTS, answerPrompt, type CopilotAnswer } from "./prompts";
import { usePort } from "@/store/use-port";
import { canPerform } from "@/lib/permissions";

type Message = { query: string; answer: CopilotAnswer; at: string };
export function Copilot({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter(),
    proposals = usePort((s) => s.proposals),
    role = usePort((s) => s.role),
    approve = usePort((s) => s.approve),
    dismiss = usePort((s) => s.dismiss),
    select = usePort((s) => s.select);
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [why, setWhy] = useState<number | null>(null),
    [confirm, setConfirm] = useState<string | null>(null),
    [modify, setModify] = useState<string | null>(null),
    [autonomy, setAutonomy] = useState("Approve to act"),
    [approvalNotice, setApprovalNotice] = useState("");
  function ask(query: string) {
    const state = usePort.getState();
    setMessages((m) => [
      ...m,
      {
        query,
        answer: answerPrompt(query, state),
        at: new Intl.DateTimeFormat("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          hour: "2-digit",
          minute: "2-digit",
        }).format(
          new Date(
            Date.parse("2026-10-28T00:00:00Z") + state.simSeconds * 1000,
          ),
        ),
      },
    ]);
    setInput("");
  }
  if (!open) return null;
  return (
    <aside className="copilot drawer" aria-label="Simulated AI copilot">
      <div className="drawer-head">
        <div>
          <span className="eyebrow">STATE-GROUNDED ASSISTANT</span>
          <h2>
            <Bot size={21} /> Port Command Copilot
          </h2>
        </div>
        <button
          aria-label="Close copilot"
          className="icon-button"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="copilot-mode">
        <span className="badge teal">Simulated data</span>
        <span>Scripted offline responses · no live model</span>
      </div>
      <label className="autonomy-label">
        Autonomy{" "}
        <select value={autonomy} onChange={(e) => setAutonomy(e.target.value)}>
          <option>Advisory</option>
          <option>Approve to act</option>
          <option>Auto for low-risk</option>
        </select>
      </label>
      {autonomy !== "Approve to act" && (
        <p className="inline-note">
          {autonomy} is a demonstration setting. Execution is disabled; use
          “Approve to act” for human-reviewed actions.
        </p>
      )}
      <div className="copilot-scroll">
        <div className="suggestions">
          <span className="eyebrow">ASK ABOUT THE SIMULATION</span>
          {PROMPTS.map((p) => (
            <button key={p} onClick={() => ask(p)}>
              {p}
            </button>
          ))}
        </div>
        {messages.map((m, i) => (
          <div className="message" key={`${i}-${m.query}`}>
            <div className="message-user">{m.query}</div>
            <div className="message-answer">
              <span className="badge teal">Simulated data</span>
              <p>{m.answer.text}</p>
              <div className="entity-chips">
                {m.answer.entities?.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      select({ type: e.type, id: e.id });
                      onClose();
                      router.push("/control");
                    }}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <div className="answer-meta">
                <span>{m.at} MYT</span>
                <span>{m.answer.confidence}</span>
              </div>
              {m.answer.evidence.length > 0 && (
                <>
                  <button
                    className="text-button"
                    onClick={() => setWhy(why === i ? null : i)}
                  >
                    Why? <ChevronDown size={14} />
                  </button>
                  {why === i && (
                    <ul className="evidence">
                      {m.answer.evidence.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {m.answer.navigate && (
                <button
                  className="button"
                  onClick={() => {
                    router.push(m.answer.navigate!);
                    onClose();
                  }}
                >
                  Open relevant portal →
                </button>
              )}
              {m.answer.proposalId &&
                (() => {
                  const p = proposals.find((x) => x.id === m.answer.proposalId);
                  const allowed = p
                    ? canPerform(
                        role,
                        p.kind === "safe_lane"
                          ? "approve_safe_lane"
                          : "approve_recovery",
                      )
                    : false;
                  return (
                    p && (
                      <div className="proposal-card">
                        <span className="eyebrow">HUMAN APPROVAL REQUIRED</span>
                        <h3>{p.title}</h3>
                        <p>{p.reason}</p>
                        <strong>{p.expectedEffect}</strong>
                        <small>{p.confidence} · Simulated data</small>
                        {p.status === "pending" ? (
                          <div className="proposal-actions">
                            <button
                              onClick={() => setConfirm(p.id)}
                              disabled={
                                autonomy !== "Approve to act" || !allowed
                              }
                            >
                              <Check size={15} /> Approve
                            </button>
                            <button onClick={() => setModify(p.id)}>
                              <Pencil size={15} /> Modify
                            </button>
                            <button onClick={() => dismiss(p.id)}>
                              <Ban size={15} /> Dismiss
                            </button>
                          </div>
                        ) : (
                          <span className="badge">
                            {p.status} by {p.actor}
                          </span>
                        )}
                        {!allowed && p.status === "pending" && (
                          <p className="muted">
                            This demo role can review this proposal but cannot
                            approve it.
                          </p>
                        )}
                        {approvalNotice && (
                          <p role="status" className="muted">
                            {approvalNotice}
                          </p>
                        )}
                        {confirm === p.id && (
                          <div
                            className="confirmation"
                            role="group"
                            aria-label="Confirm simulated proposal"
                          >
                            <p>
                              Apply this simulated action and record your demo
                              role in the audit log?
                            </p>
                            <button
                              disabled={!allowed}
                              onClick={() => {
                                approve(p.id);
                                if (
                                  usePort
                                    .getState()
                                    .proposals.find((item) => item.id === p.id)
                                    ?.status === "approved"
                                ) {
                                  setConfirm(null);
                                  setApprovalNotice("");
                                } else {
                                  setApprovalNotice(
                                    "Approval was not applied. Check your demo role and proposal status.",
                                  );
                                }
                              }}
                            >
                              Confirm approval
                            </button>
                            <button onClick={() => setConfirm(null)}>
                              Cancel
                            </button>
                          </div>
                        )}
                        {modify === p.id && (
                          <div
                            className="confirmation"
                            role="group"
                            aria-label="Modify proposal"
                          >
                            <p>
                              Modification requests are recorded for review.
                              They do not move equipment.
                            </p>
                            <textarea
                              aria-label="Modification request"
                              placeholder="Describe requested change"
                              id={`modify-${p.id}`}
                            />
                            <button
                              onClick={() => {
                                const value = (
                                  document.getElementById(
                                    `modify-${p.id}`,
                                  ) as HTMLTextAreaElement
                                )?.value.trim();
                                if (value) {
                                  usePort
                                    .getState()
                                    .requestModification(p.id, value);
                                  setModify(null);
                                }
                              }}
                            >
                              Record request
                            </button>
                            <button onClick={() => setModify(null)}>
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  );
                })()}
            </div>
          </div>
        ))}
      </div>
      <form
        className="copilot-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) ask(input);
        }}
      >
        <input
          aria-label="Ask the copilot"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this simulated shift"
        />
        <button aria-label="Send question" disabled={!input.trim()}>
          <Send size={17} />
        </button>
      </form>
    </aside>
  );
}
