
import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./Authpage.css";

export default function AuthPage() {
  const [role, setRole] = useState("artist");
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name.trim(),
                role,
              },
            },
          });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setMessage(
            "Check your email to confirm your account, then sign in."
          );
        } else {
          setMessage("Account created successfully!");
        }
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) throw signInError;

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

        if (profileError) throw profileError;

        if (profile.role !== role) {
          await supabase.auth.signOut();
          throw new Error(
            `This account belongs to the ${
              profile.role === "artist" ? "Artist" : "Buyer"
            } portal. Please choose the correct portal.`
          );
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <a href="/" className="auth-logo">
          ARTPRENEUR 🌻
        </a>

        <p className="auth-eyebrow">
          ✦ A WORLD OF ART & POSSIBILITY ✦
        </p>

        <h1>
          <span>Where Creativity</span>
          <em>Finds Its Place.</em>
        </h1>

        <p className="auth-subtitle">
          Every masterpiece begins with a story.
          <br />
          Yours begins here.
        </p>

        <div className="auth-roles">
          <button
            type="button"
            className={role === "artist" ? "selected" : ""}
            onClick={() => {
              setRole("artist");
              setError("");
              setMessage("");
            }}
          >
            🎨 I'm an Artist
          </button>

          <button
            type="button"
            className={role === "buyer" ? "selected" : ""}
            onClick={() => {
              setRole("buyer");
              setError("");
              setMessage("");
            }}
          >
            🛍️ I'm a Buyer
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>
            {role === "artist" ? "Artist" : "Buyer"}{" "}
            {mode === "signup" ? "Sign Up" : "Sign In"}
          </h2>

          {mode === "signup" && (
            <>
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}

          <label htmlFor="auth-email">Email Address</label>
          <input
            id="auth-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-success" role="status">
              {message}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Create Account →"
              : "Sign In →"}
          </button>

          <p className="auth-switch">
            {mode === "signup"
              ? "Already have an account?"
              : "New to Artpreneur?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(
                  mode === "signup" ? "signin" : "signup"
                );
                setError("");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Sign In"
                : "Create Account"}
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
