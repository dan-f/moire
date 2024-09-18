import { useMemo } from "react";
import { ConsoleLogger } from "../../lib/ConsoleLogger";
import { Logger } from "../../lib/Logger";

export function useLogger(label: string): Logger {
  return useMemo(() => new ConsoleLogger(label), [label]);
}
