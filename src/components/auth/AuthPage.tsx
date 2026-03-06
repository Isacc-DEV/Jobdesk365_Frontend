/* global fetch */
import { useEffect, useState } from "react";
import { API_BASE, TOKEN_KEY } from "../../config";
import BrandPanel from "./BrandPanel";
import AuthCard from "./AuthCard";
import InputField from "./InputField";

const AuthPage = () => {
  const workerBlockMessage = "plz contact to support team and get verified as internal worker";
  const blockedMessage = "Your account is blocked. Please contact support team.";
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [isInternalUser, setIsInternalUser] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const isSignIn = mode === "signin";
  const isVerificationPending = mode === "verify-pending";

  const backendBase = API_BASE || "";

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const resetErrors = () => {
    setUsernameError("");
    setFormError("");
  };

  const storeTokenAndGo = (token) => {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.location.href = "/dashboard";
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
  };

  const handleResendVerification = async () => {
    const targetEmail = (pendingVerificationEmail || email || "").trim().toLowerCase();
    if (!targetEmail) {
      setFormError("Email is required.");
      return;
    }
    if (resendCooldown > 0) return;
    setLoading(true);
    setFormError("");
    try {
      const res = await fetch(`${backendBase}/auth/email-verification/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      });
      if (!res.ok) {
        throw new Error("Unable to resend verification email.");
      }
      setPendingVerificationEmail(targetEmail);
      startResendCooldown();
    } catch (err) {
      setFormError(err?.message || "Unable to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    resetErrors();
    if (!email || !password) {
      setFormError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        let msg = "Unable to sign in.";
        try {
          const data = await res.json();
          msg = data?.message || data?.error || msg;
          if (data?.error === "worker_not_verified") {
            msg = workerBlockMessage;
          }
          if (data?.error === "account_blocked") {
            msg = blockedMessage;
          }
          if (data?.error === "email_not_verified") {
            setPendingVerificationEmail(email.trim().toLowerCase());
            setMode("verify-pending");
          }
        } catch {
          const text = await res.text();
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      storeTokenAndGo(data.token);
    } catch (err) {
      setFormError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    resetErrors();
    const re = /^[a-z0-9]+$/;
    if (!re.test(username)) {
      setUsernameError("Lowercase letters and numbers only.");
      return;
    }
    if (!email || !password || !confirmPassword) {
      setFormError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (!agree) {
      setFormError("Please accept Terms and Privacy Policy.");
      return;
    }
    const register = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${backendBase}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            username,
            password,
            is_internal_user: isInternalUser
          })
        });
        let data = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        if (!res.ok) {
          const msg = data?.message || data?.error || "Unable to create account.";
          throw new Error(msg);
        }
        if (data?.status === "verification_required") {
          setPendingVerificationEmail(String(data.email || email).trim().toLowerCase());
          setMode("verify-pending");
          startResendCooldown();
          setFormError("");
          return;
        }
        storeTokenAndGo(data?.token);
      } catch (err) {
        setFormError(err.message || "Unable to create account.");
      } finally {
        setLoading(false);
      }
    };
    register();
  };

  return (
    <div className="min-h-screen bg-page text-ink grid grid-cols-[520px_1fr]">
      <BrandPanel />
      <div className="flex items-start justify-center pt-16">
        {isSignIn ? (
          <AuthCard
            title="Sign in"
            subtitle="Welcome back - sign in to continue."
            footer={
              <div className="flex items-center gap-1">
                <span>New here?</span>
                <button
                  type="button"
                  onClick={() => {
                    resetErrors();
                    setMode("signup");
                  }}
                  className="text-accent-primary font-semibold"
                >
                  Create an account
                </button>
              </div>
            }
          >
            <InputField
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={formError && !email ? "Email is required" : ""}
            />
            <InputField
              label="Password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={formError && !password ? "Password is required" : ""}
            />
            <div className="flex justify-end text-sm">
              <button type="button" className="text-accent-primary font-semibold">
                Forgot password?
              </button>
            </div>
            {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
            <button
              className="w-full h-12 rounded-xl bg-accent-primary text-white font-bold disabled:opacity-60"
              type="button"
              onClick={handleSignIn}
              disabled={loading}
            >
              Sign in
            </button>
            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-border" />
              <span className="text-[12px] text-ink-muted">OR</span>
              <span className="flex-1 h-px bg-border" />
            </div>
            <button className="w-full h-12 rounded-xl border border-border bg-white font-semibold text-ink">
              Continue with Google
            </button>
          </AuthCard>
        ) : isVerificationPending ? (
          <AuthCard
            title="Verify your email"
            subtitle="A verification link has been sent. Open it to activate your account."
            footer={
              <button
                type="button"
                className="text-accent-primary font-semibold"
                onClick={() => {
                  resetErrors();
                  setMode("signin");
                }}
              >
                Back to sign in
              </button>
            }
          >
            <p className="text-sm text-ink-muted">
              Email: <span className="font-semibold text-ink">{pendingVerificationEmail || email}</span>
            </p>
            {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
            <button
              type="button"
              className="w-full h-12 rounded-xl bg-accent-primary text-white font-bold disabled:opacity-60"
              onClick={handleResendVerification}
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
            </button>
          </AuthCard>
        ) : (
          <AuthCard
            title="Create account"
            subtitle="Start using JobDesk365 in minutes."
            footer={
              <div className="flex items-center gap-1">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    resetErrors();
                    setMode("signin");
                  }}
                  className="text-accent-primary font-semibold"
                >
                  Sign in
                </button>
              </div>
            }
          >
            <InputField
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
              label="Username"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={usernameError}
            />
            <InputField
              label="Password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <InputField
              label="Confirm password"
              type="password"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={isInternalUser}
                onChange={(e) => setIsInternalUser(e.target.checked)}
              />
              Register as internal user
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I agree to the Terms and Privacy Policy
            </label>
            {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
            <button
              className="w-full h-12 rounded-xl bg-accent-primary text-white font-bold disabled:opacity-60"
              type="button"
              onClick={handleCreate}
              disabled={loading}
            >
              Create account
            </button>
          </AuthCard>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
