/* global fetch */
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../config";
import { requireSupabase } from "../../lib/supabase";
import AuthCard from "./AuthCard";
import BrandPanel from "./BrandPanel";
import InputField from "./InputField";

const ALLOWED_VERIFY_TYPES = new Set(["signup", "email", "magiclink"]);

const EmailVerifyPage = () => {
  const backendBase = API_BASE || "";
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Checking your verification link...");
  const [resendEmail, setResendEmail] = useState("");
  const [resendEmailInput, setResendEmailInput] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);

  const query = useMemo(() => new URLSearchParams(window.location.search || ""), []);
  const hashQuery = useMemo(
    () => new URLSearchParams((window.location.hash || "").replace(/^#/, "")),
    []
  );
  const tokenHash = query.get("token_hash") || "";
  const type = query.get("type") || "";
  const nonce = query.get("vnonce") || "";
  const hashAccessToken = hashQuery.get("access_token") || "";

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const verify = async () => {
      if (!nonce) {
        setStatus("error");
        setMessage("Verification link is missing required nonce.");
        return;
      }
      try {
        let accessToken = hashAccessToken;
        if (!accessToken) {
          if (!tokenHash || !type) {
            setStatus("error");
            setMessage("Verification link is missing required parameters.");
            return;
          }
          if (!ALLOWED_VERIFY_TYPES.has(type)) {
            setStatus("error");
            setMessage("Unsupported verification link type.");
            return;
          }
          const supabase = requireSupabase();
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type
          });
          if (error) {
            setStatus("error");
            setMessage("Verification link is invalid or expired. Request a new one.");
            return;
          }
          const verifiedEmail = String(data?.user?.email || "").trim().toLowerCase();
          if (verifiedEmail) {
            setResendEmail(verifiedEmail);
            setResendEmailInput(verifiedEmail);
          }
          accessToken = data?.session?.access_token || "";
        }

        if (!accessToken) {
          setStatus("error");
          setMessage("Verification session was not created. Please request a new verification email.");
          return;
        }

        const confirmRes = await fetch(`${backendBase}/auth/email-verification/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ nonce })
        });

        if (!confirmRes.ok) {
          let errorCode = "verification_failed";
          try {
            const payload = await confirmRes.json();
            errorCode = String(payload?.error || errorCode);
          } catch {
            errorCode = "verification_failed";
          }
          setStatus("error");
          if (errorCode === "invalid_verification_nonce") {
            setMessage("This verification link is no longer valid. Request a new one.");
            return;
          }
          if (errorCode === "verification_link_expired") {
            setMessage("This verification link has expired. Request a new one.");
            return;
          }
          setMessage("Unable to verify email right now. Please request a new link.");
          return;
        }

        setStatus("success");
        setMessage("Email verified. You can now sign in.");
      } catch {
        setStatus("error");
        setMessage("Unable to verify email right now. Please request a new link.");
      }
    };

    void verify();
  }, [backendBase, hashAccessToken, nonce, tokenHash, type]);

  const handleResend = async () => {
    const targetEmail = (resendEmailInput || resendEmail).trim().toLowerCase();
    if (!targetEmail || resendCooldown > 0 || resendBusy) {
      return;
    }
    setResendBusy(true);
    try {
      const res = await fetch(`${backendBase}/auth/email-verification/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      });
      if (res.ok) {
        setResendEmail(targetEmail);
        setResendCooldown(60);
      }
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink grid grid-cols-[520px_1fr]">
      <BrandPanel />
      <div className="flex items-start justify-center pt-16">
        <AuthCard
          title={status === "success" ? "Email verified" : status === "error" ? "Verification failed" : "Verifying"}
          subtitle={message}
          footer={
            <button
              type="button"
              className="text-accent-primary font-semibold"
              onClick={() => {
                window.location.href = "/auth";
              }}
            >
              Go to sign in
            </button>
          }
        >
          {status === "verifying" ? (
            <p className="text-sm text-ink-muted">Please wait...</p>
          ) : null}
          {status === "error" ? (
            <>
              {resendEmail ? (
                <p className="text-sm text-ink-muted">
                  Resend to: <span className="font-semibold text-ink">{resendEmail}</span>
                </p>
              ) : null}
              <InputField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={resendEmailInput}
                onChange={(e) => setResendEmailInput(e.target.value)}
              />
              <button
                type="button"
                className="w-full h-12 rounded-xl bg-accent-primary text-white font-bold disabled:opacity-60"
                onClick={handleResend}
                disabled={!(resendEmailInput || resendEmail) || resendBusy || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
              </button>
            </>
          ) : null}
        </AuthCard>
      </div>
    </div>
  );
};

export default EmailVerifyPage;
