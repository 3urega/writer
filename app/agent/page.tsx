import Link from "next/link";

export default function AgentProfilePage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-8 text-cf-text">
      <Link
        href="/"
        className="text-sm text-cf-text-muted hover:text-cf-text"
      >
        Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Agent profile</h1>
      <p className="mt-2 text-sm text-cf-text-muted">
        Style and tone for the writing assistant. Coming next.
      </p>
    </div>
  );
}
