"use client";

import {
  Car,
  Check,
  Laptop,
  MonitorSpeaker,
  Smartphone,
  Speaker,
  Tv,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";

const DEVICES = [
  { id: "this-device", label: "This device", icon: Laptop },
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "speaker", label: "Living Room Speaker", icon: Speaker },
  { id: "tv", label: "Smart TV", icon: Tv },
  { id: "car", label: "Car", icon: Car },
];

export function DeviceMenu({
  align = "end",
}: {
  align?: "start" | "center" | "end";
}) {
  const connectedDevice = usePlayerStore((s) => s.connectedDevice);
  const setConnectedDevice = usePlayerStore((s) => s.setConnectedDevice);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Connect to a device"
          title={connectedDevice ? `Playing on ${connectedDevice}` : "Connect to a device"}
          className={cn(
            "h-8 w-8",
            connectedDevice
              ? "text-[color:var(--accent)] hover:text-[color:var(--accent)]"
              : "text-zinc-400 hover:text-zinc-100"
          )}
        >
          {connectedDevice ? (
            <MonitorSpeaker className="size-4" />
          ) : (
            <Speaker className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-56 border-white/10 bg-zinc-900 text-zinc-100"
      >
        <DropdownMenuLabel className="text-xs font-medium text-zinc-500">
          Connect to a device
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {DEVICES.map(({ id, label, icon: Icon }) => {
          const active = connectedDevice === label;
          return (
            <DropdownMenuItem
              key={id}
              onClick={() => {
                setConnectedDevice(label);
                toast(`Connected to ${label}`);
              }}
              className={cn("gap-2", active && "text-[color:var(--accent)]")}
            >
              <Icon
                className={cn(
                  "size-4",
                  active && "text-[color:var(--accent)]"
                )}
              />
              <span className="flex-1">{label}</span>
              {active && <Check className="size-4" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
