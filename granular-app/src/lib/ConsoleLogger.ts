import { type Logger } from "./Logger";

export class ConsoleLogger implements Logger {
  private label: string;

  constructor(context: string) {
    this.label = context;
  }

  debug(msg: string, data?: object): void {
    this.inModes(["development"], () => {
      console.debug(...this.fmt(msg, data));
    });
  }

  info(msg: string, data?: object): void {
    this.inModes(["development"], () => {
      console.info(...this.fmt(msg, data));
    });
  }

  warn(msg: string, data?: object): void {
    this.inModes(["development", "production"], () => {
      console.warn(...this.fmt(msg, data));
    });
  }

  error(msg: string, data?: object, error?: Error): void {
    this.inModes(["development", "production"], () => {
      console.error(...this.fmt(msg, data));
      if (error) {
        console.error(error);
      }
    });
  }

  fatal(msg: string, data?: object, error?: Error): void {
    this.inModes(["development", "production"], () => {
      console.error(...this.fmt(msg, data));
      if (error) {
        console.error(error);
      }
    });
  }

  private fmt(msg: string, data?: object) {
    return [`%c[${this.label}]`, "color:slategrey", msg, data].filter(
      (x) => x != null,
    );
  }

  private inModes(modes: string[], cb: (env: string) => void) {
    const mode = import.meta.env.MODE;
    if (modes.includes(mode)) {
      cb(mode);
    }
  }
}
