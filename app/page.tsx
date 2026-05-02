import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-6 py-10">
      <div className="flex w-full max-w-[680px] flex-col items-center">
        <section className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="size-[6px] bg-[#e87c2e]" aria-hidden="true" />
            <p className="font-mono text-[11px] tracking-widest text-[#555555] uppercase">
              Stranded
            </p>
          </div>
          <h1 className="mx-auto mt-5 max-w-[600px] text-center text-[42px] leading-[1.2] font-semibold text-[#efefef]">
            Disaster triage that starts with the people most at risk.
          </h1>
          <p className="mt-3 font-mono text-xs text-[#444444]">
            Hurricane Helene &middot; Asheville, NC &middot; September 2024
          </p>
        </section>

        <div className="mt-12 grid w-full gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="flex min-h-[214px] cursor-pointer flex-col rounded border border-[#282828] bg-[#0f0f0f] p-7 transition-colors duration-200 hover:border-[#e87c2e]"
          >
            <p className="font-mono text-[10px] tracking-wide text-[#555555] uppercase">
              Responder Access
            </p>
            <h2 className="mt-5 text-lg font-semibold text-[#efefef]">Open Dashboard</h2>
            <p className="mt-3 text-[13px] leading-5 text-[#666666]">
              Real-time triage rankings, AI dispatch briefings, demographic vulnerability data.
            </p>
            <p className="mt-auto font-mono text-[11px] text-[#e87c2e]">&rarr; /dashboard</p>
          </Link>

          <Link
            href="/register"
            className="flex min-h-[214px] cursor-pointer flex-col rounded border border-[#282828] bg-[#0f0f0f] p-7 transition-colors duration-200 hover:border-[#e87c2e]"
          >
            <p className="font-mono text-[10px] tracking-wide text-[#555555] uppercase">Registry</p>
            <h2 className="mt-5 text-lg font-semibold text-[#efefef]">
              Register a Vulnerable Person
            </h2>
            <p className="mt-3 text-[13px] leading-5 text-[#666666]">
              Add someone to the vulnerable persons registry before the next disaster.
            </p>
            <p className="mt-auto font-mono text-[11px] text-[#555555]">&rarr; /register</p>
          </Link>
        </div>

        <p className="mt-12 text-center font-mono text-[10px] text-[#333333]">
          15 registrants &middot; 10 damage zones &middot; Buncombe County, NC
        </p>
      </div>
    </main>
  );
}
