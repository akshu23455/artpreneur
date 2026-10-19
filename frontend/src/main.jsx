
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AuthPage from "./components/Authpage.jsx";
import { supabase } from "./supabaseClient.js";
import "./index.css";

function Root() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      setSession(session);
      setProfile(error ? null : data);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#071d36",
        color: "#ffca55",
        fontFamily: "Georgia, serif",
        fontSize: "24px"
      }}>
        ARTPRENEUR 🌻 Loading...
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (!profile) {
    return (
      <div style={{
        minHeight: "100vh",
        padding: "60px 20px",
        background: "#071d36",
        color: "#fff3d6",
        textAlign: "center"
      }}>
        <h2>Unable to load your account profile.</h2>
        <p>Please check your Supabase profile setup.</p>
        <button onClick={() => supabase.auth.signOut()}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <App
      user={session.user}
      profile={profile}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
