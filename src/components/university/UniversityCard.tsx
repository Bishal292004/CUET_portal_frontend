import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Bookmark, BookmarkCheck, IndianRupee, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, Tag, UniAvatar } from "@/components/common";
import { inr } from "@/lib/format";
import type { Programme, University } from "@/lib/types";

export function UniversityCard({
  uni,
  programmes = [],
  followed,
  onToggleFollow,
}: {
  uni: University;
  programmes?: Programme[];
  followed?: boolean;
  onToggleFollow?: () => void;
}) {
  const fees = programmes.map((p) => p.annualFee).filter((f): f is number => typeof f === "number");
  const seats = programmes.reduce((s, p) => s + (p.totalSeats ?? 0), 0);
  return (
    <div className="card-surface card-hover flex flex-col p-6">
      <div className="flex items-start justify-between">
        <UniAvatar uni={uni} />
        {onToggleFollow && (
          <button
            onClick={onToggleFollow}
            aria-label={followed ? "Unfollow" : "Follow"}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            {followed ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </button>
        )}
      </div>
      <div className="mt-4"><StatusBadge status={uni.admissionStatus} /></div>
      <h3 className="mt-3 text-lg font-bold text-foreground">{uni.name}</h3>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" /> {[uni.city, uni.state].filter(Boolean).join(", ")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {programmes.slice(0, 3).map((p) => (
          <Tag key={p._id}>{typeof p.course === "object" ? p.course.name : p.programmeName}</Tag>
        ))}
        {programmes.length > 3 && <Tag tone="primary">+{programmes.length - 3}</Tag>}
      </div>
      <div className="mt-auto">
        <div className="mt-5 flex gap-5 border-y py-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />{fees.length ? `${inr(Math.min(...fees)).slice(1)}/yr` : "—"}</span>
          <span className="flex items-center gap-1"><Users className="h-4 w-4" />{seats || "—"} seats</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button asChild size="sm">
            <Link to="/universities/$id" params={{ id: uni._id }}>
              View details <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">{programmes.length} courses</span>
        </div>
      </div>
    </div>
  );
}
