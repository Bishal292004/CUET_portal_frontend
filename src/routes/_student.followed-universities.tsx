import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState, Loading, PageHeader } from "@/components/common";
import { UniversityCard } from "@/components/university/UniversityCard";
import { useAllProgrammes, useFollow } from "@/lib/hooks";
import { refId } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_student/followed-universities")({
  head: () => seo("Followed Universities", "Universities you follow for merit list and counselling updates."),
  component: Followed,
});

function Followed() {
  const follow = useFollow();
  const progs = useAllProgrammes();
  return (
    <>
      <PageHeader eyebrow="Saved" title="Followed universities" description="You'll be notified when these universities publish merit lists or updates." />
      {follow.isLoading ? <Loading /> : follow.list.length === 0 ? (
        <EmptyState title="You're not following any universities" action={<Button asChild><Link to="/universities">Browse universities</Link></Button>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {follow.list.map(({ university: u }) => (
            <UniversityCard key={u._id} uni={u} programmes={(progs.data ?? []).filter((p) => refId(p.university) === u._id)} followed onToggleFollow={() => follow.toggle(u._id)} />
          ))}
        </div>
      )}
    </>
  );
}
