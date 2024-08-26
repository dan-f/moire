import { type Logger } from "./Logger";

export class ConsoleLogger implements Logger {
  private label: string;

  constructor(context: string) {
    this.label = context;
  }

  debug(msg: string, data?: object): void {
    this.inModes(["development"], () => {
      console.debug(...[this.fmtMsg(msg), data].filter((x) => x != null));
    });
  }

  info(msg: string, data?: object): void {
    this.inModes(["development"], () => {
      console.info(...[this.fmtMsg(msg), data].filter((x) => x != null));
    });
  }

  warn(msg: string, data?: object): void {
    this.inModes(["development", "production"], () => {
      console.warn(...[this.fmtMsg(msg), data].filter((x) => x != null));
    });
  }

  error(msg: string, data?: object, error?: Error): void {
    this.inModes(["development", "production"], () => {
      console.error(...[this.fmtMsg(msg), data].filter((x) => x != null));
      if (error) {
        console.error(error);
      }
    });
  }

  fatal(msg: string, data?: object, error?: Error): void {
    this.inModes(["development", "production"], () => {
      console.error(...[this.fmtMsg(msg), data].filter((x) => x != null));
      if (error) {
        console.error(error);
      }
    });
  }

  private fmtMsg(msg: string): string {
    return `[${this.label}] ${msg}`;
  }

  private inModes(modes: string[], cb: (env: string) => void) {
    const mode = import.meta.env.MODE;
    if (modes.includes(mode)) {
      cb(mode);
    }
  }
}
