import { ArrowDownAZ, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardSort } from "@/lib/dashboardSort";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const labels: Record<DashboardSort, string> = {
  "last-uploaded": "Last uploaded",
  alphabetical: "Alphabetical",
};

export function DashboardSortControl({
  value,
  onChange,
}: {
  value: DashboardSort;
  onChange: (value: DashboardSort) => void;
}) {
  const alphabeticalReadiness = useQuery(api.dashboardSort.isAlphabeticalReady);
  const alphabeticalReady = alphabeticalReadiness === true;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={`Sort dashboard: ${labels[value]}`}>
          {value === "last-uploaded" ? (
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{labels[value]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue === "last-uploaded" || nextValue === "alphabetical") {
              onChange(nextValue);
            }
          }}
        >
          <DropdownMenuRadioItem value="last-uploaded">Last uploaded</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="alphabetical" disabled={!alphabeticalReady}>
            {alphabeticalReady ? (
              "Alphabetical"
            ) : (
              <span className="flex flex-col">
                <span>Alphabetical — preparing…</span>
                <span className="text-[11px] font-normal text-[#888]">
                  {alphabeticalReadiness === undefined
                    ? "Checking title index availability"
                    : "Finishing the one-time title index"}
                </span>
              </span>
            )}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
