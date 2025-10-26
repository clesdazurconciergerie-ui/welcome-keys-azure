import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { loadThemeFromDatabase, saveThemeToDatabase } from "@/lib/theme-db";
import { DEFAULT_THEME, Theme } from "@/types/theme";
import EditBooklet from "./EditBooklet";
import { toast } from "sonner";

export default function EditBookletWrapper() {
  const { id } = useParams();
  const [initialTheme, setInitialTheme] = useState<Theme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadThemeFromDatabase(id)
        .then(theme => {
          setInitialTheme(theme);
          setLoading(false);
        })
        .catch(() => {
          setInitialTheme(DEFAULT_THEME);
          setLoading(false);
        });
    }
  }, [id]);

  const handleThemeChange = async (theme: Theme) => {
    if (!id) return;
    
    try {
      await saveThemeToDatabase(id, theme);
      toast.success("Thème enregistré avec succès");
    } catch (error) {
      console.error("Error saving theme:", error);
      toast.error("Erreur lors de l'enregistrement du thème");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <ThemeProvider initialTheme={initialTheme} onThemeChange={handleThemeChange}>
      <EditBooklet />
    </ThemeProvider>
  );
}
