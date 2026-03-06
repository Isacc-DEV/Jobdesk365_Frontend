import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "../../hooks/useUser";
import { billingService, dispatchUserRefresh } from "../../services/billingService";

const PENDING_TOPUP_STORAGE_KEY = "billing.pendingTopupId";

const normalizeTopupId = (value: unknown) => {
  const text = String(value || "").trim();
  return text || null;
};

const PaymentReturnPage = () => {
  const { reloadUser } = useUser();
  const [topupId, setTopupId] = useState<string | null>(null);
  const [nowPaymentId, setNowPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("unknown");
  const [credited, setCredited] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const mode = useMemo(() => {
    if (typeof window === "undefined") return "success";
    return window.location.pathname.startsWith("/payment-cancel") ? "cancel" : "success";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new window.URLSearchParams(window.location.search || "");
    const idFromQuery = normalizeTopupId(params.get("topup_id"));
    const npIdFromQuery = normalizeTopupId(params.get("NP_id") || params.get("np_id"));
    const idFromStorage = normalizeTopupId(window.localStorage.getItem(PENDING_TOPUP_STORAGE_KEY));
    const resolved = idFromQuery || idFromStorage;
    setTopupId(resolved);
    setNowPaymentId(npIdFromQuery);
    if (mode === "cancel") {
      setLoading(false);
    }
  }, [mode]);

  const loadStatus = useCallback(
    async (targetTopupId: string, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await billingService.getTopupStatus(targetTopupId, nowPaymentId);
        const topup = data?.topup || {};
        const status = String(topup.payment_status || "unknown").toLowerCase();
        const isCredited = Boolean(topup.credited_at);
        const isTerminal = Boolean(topup.is_terminal) || isCredited;

        setPaymentStatus(status);
        setCredited(isCredited);
        setTerminal(isTerminal);

        if (typeof data?.balance === "number" && Number.isFinite(data.balance)) {
          setBalanceAfter(data.balance);
        }

        if (isTerminal) {
          const currentPending = normalizeTopupId(window.localStorage.getItem(PENDING_TOPUP_STORAGE_KEY));
          if (currentPending && currentPending === targetTopupId) {
            window.localStorage.removeItem(PENDING_TOPUP_STORAGE_KEY);
          }
        }

        if (isCredited) {
          dispatchUserRefresh();
          if (typeof reloadUser === "function") {
            await reloadUser();
          }
        }
        setError("");
      } catch (err) {
        setError(err?.message || "Unable to load payment status.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [nowPaymentId, reloadUser]
  );

  useEffect(() => {
    if (mode !== "success") return;
    if (!topupId) {
      setLoading(false);
      return;
    }
    void loadStatus(topupId);
  }, [loadStatus, mode, topupId]);

  useEffect(() => {
    if (mode !== "success") return;
    if (!topupId || terminal) return;
    const timer = window.setInterval(() => {
      void loadStatus(topupId, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadStatus, mode, terminal, topupId]);

  const title =
    mode === "cancel"
      ? "Payment canceled"
      : credited
        ? "Payment received"
        : "Payment is processing";

  const subtitle =
    mode === "cancel"
      ? "You can retry anytime from Billing."
      : credited
        ? "Your credits were added successfully."
        : "Waiting for NOWPayments confirmation.";

  return (
    <main className="bg-main min-h-[calc(100vh-64px)] border-t border-border px-8 py-8 grid place-items-center">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-white p-8">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>

        {topupId ? (
          <div className="mt-5 rounded-xl border border-border bg-[#F9FAFB] p-4 text-sm text-ink">
            <p>
              <span className="text-ink-muted">Topup ID:</span> {topupId}
            </p>
            <p className="mt-1">
              <span className="text-ink-muted">Status:</span> {paymentStatus}
            </p>
            {balanceAfter !== null ? (
              <p className="mt-1">
                <span className="text-ink-muted">Balance:</span> ${Number(balanceAfter).toFixed(2)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-ink-muted">No topup reference found in this URL.</p>
        )}

        {loading ? <p className="mt-4 text-sm text-ink-muted">Checking payment status...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/user";
            }}
            className="h-11 rounded-xl bg-accent-primary px-5 text-sm font-semibold text-white"
          >
            Back to Profile
          </button>
          {mode === "success" && topupId ? (
            <button
              type="button"
              onClick={() => {
                void loadStatus(topupId);
              }}
              className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-ink"
            >
              Refresh Status
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default PaymentReturnPage;
