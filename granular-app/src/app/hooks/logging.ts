import { useMemo } from "react";
import { DefaultLogger } from "../../lib/DefaultLogger";
import { Logger } from "../../lib/Logger";

export function useLogger(label: string): Logger {
  return useMemo(() => new DefaultLogger(label), [label]);
}
