import Link from "next/link";
import { Shield, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Stranded</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
            Disaster triage that starts with the people most at risk.
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/dashboard" className="block">
            <Card className="h-full transition-colors hover:bg-zinc-50">
              <CardHeader>
                <Shield className="size-8 text-zinc-950" aria-hidden="true" />
                <CardTitle>I&apos;m a responder</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-zinc-600">
                View the real-time triage dashboard.
              </CardContent>
            </Card>
          </Link>

          <Link href="/register" className="block">
            <Card className="h-full transition-colors hover:bg-zinc-50">
              <CardHeader>
                <UserPlus className="size-8 text-zinc-950" aria-hidden="true" />
                <CardTitle>Register or help someone register</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-zinc-600">
                Add someone to the vulnerable persons registry.
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
