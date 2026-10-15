"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  GraduationCap,
  Home,
  Menu,
  Search,
  Upload,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { CommandPalette, useCommandPalette } from "./command-palette";
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const focused =
    pathname.includes("/apresentar") || /\/alunos\//.test(pathname);
  const cmd = useCommandPalette();
  const [menu, setMenu] = useState(false);
  const { setTheme } = useTheme();
  return (
    <div className="console-app">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      {!focused && (
        <header className="console-nav">
          <Link className="brand" href="/">
            <span className="brand-icon">
              <GraduationCap />
            </span>
            <span>
              Conselho<span className="brand-subtitle">Espaço de decisões</span>
            </span>
          </Link>
          <nav aria-label="Navegação principal">
            <Button asChild variant={pathname === "/" ? "secondary" : "ghost"}>
              <Link href="/">
                <Home />
                <span>Início</span>
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => cmd.setOpen(true)}>
              <Search />
              <span>Busca</span>
            </Button>
            <Button variant="ghost" onClick={() => setMenu(true)}>
              <Menu />
              <span>Menu</span>
            </Button>
          </nav>
        </header>
      )}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <CommandPalette open={cmd.open} setOpen={cmd.setOpen} />
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seu espaço</DialogTitle>
            <DialogDescription>
              Importação e aparência do Conselho.
            </DialogDescription>
          </DialogHeader>
          <Button asChild size="lg">
            <Link href="/importar" onClick={() => setMenu(false)}>
              <Upload /> Importar mapão
            </Link>
          </Button>
          <h2 className="text-lg font-semibold mt-4">Aparência</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "dark", name: "Escuro", icon: Moon },
              { value: "light", name: "Claro", icon: Sun },
              { value: "system", name: "Sistema", icon: Monitor },
            ].map(({ value, name, icon: Icon }) => (
              <Button
                key={value}
                variant="outline"
                onClick={() => setTheme(value)}
              >
                <Icon />
                {name}
              </Button>
            ))}
          </div>
          <p className="supporting-text">Seus dados ficam neste navegador.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
