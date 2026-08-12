"use client";

import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function VoiceFab() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-lg"
            className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg"
            aria-label="Enregistrer une idée vocale"
          />
        }
      >
        <Mic className="size-5" />
      </TooltipTrigger>
      <TooltipContent side="left">Boîte à idées vocale</TooltipContent>
    </Tooltip>
  );
}
