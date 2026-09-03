import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to Tuto"
      subtitle="Pick up right where you left off with your notes and schoolwork."
      mascotMood="greeting"
      footer={
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          New to Tuto?{" "}
          <Link to="/sign-up" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>{error}</p>
        )}
        <div style={{ textAlign: "right" }}>
          <Link
            to="/forgot-password"
            style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
