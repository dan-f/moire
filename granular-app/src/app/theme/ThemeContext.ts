import { createContext } from "react";
import { Theme } from "./theme";

export const ThemeContext = createContext<Theme | null>(null);
