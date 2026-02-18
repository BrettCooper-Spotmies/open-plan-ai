import { useTheme } from "next-themes";
import { useUserStore } from "@/stores/useUserStore";

export function useAppTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const updatePreferences = useUserStore((s) => s.updatePreferences);

  const changeTheme = (t: "light" | "dark" | "system") => {
    setTheme(t);
    updatePreferences({ theme: t });
  };

  return { theme, resolvedTheme, changeTheme };
}
