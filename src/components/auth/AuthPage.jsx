/* global fetch */
import { useState } from "react";
import BrandPanel from "./BrandPanel";
import AuthCard from "./AuthCard";
import InputField from "./InputField";

const AuthPage = () => {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignIn = mode === "signin";

  const API_BASE = "http://localhost:4000";

  const resetErrors = () => {
    setUsernameError("");
    setFormError("");
  };

  const storeTokenAndGo = (token) => {
    if (token) {
      window.localStorage.setItem("authToken", token);
      window.location.href = "/";
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
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const msg = (await res.text()) || "Unable to sign in.";
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
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password })
        });
        if (!res.ok) {
          const msg = (await res.text()) || "Unable to create account.";
          throw new Error(msg);
        }
        const data = await res.json();
        storeTokenAndGo(data.token);
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
            subtitle="Welcome back — sign in to continue."
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
              placeholder="••••••••"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <InputField
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
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
