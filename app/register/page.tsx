import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const DEPENDENCY_OPTIONS = [
  "Uses oxygen",
  "Needs dialysis",
  "Uses wheelchair or mobility aid",
  "Deaf or hard of hearing",
  "Blind or low vision",
  "Lives alone",
];

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Stranded</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
            Vulnerable Persons Registry
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            Registration will help responders identify people who may need specialized aid during a
            disaster, including medical equipment, accessible transportation, translation, or a
            welfare check.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Voice registration coming soon — call (TBD) to register by phone
        </div>

        <form
          className="rounded-xl border border-zinc-200 bg-white p-5 opacity-60 shadow-sm"
          aria-disabled="true"
        >
          <fieldset disabled className="space-y-5">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-zinc-700">
                Full name
              </label>
              <Input id="name" className="mt-2 bg-zinc-100" placeholder="Name" />
            </div>

            <div>
              <label htmlFor="address" className="text-sm font-medium text-zinc-700">
                Address
              </label>
              <Input id="address" className="mt-2 bg-zinc-100" placeholder="Home address" />
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-700">Dependencies</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {DEPENDENCY_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-zinc-600">
                    <Checkbox />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </main>
  );
}
