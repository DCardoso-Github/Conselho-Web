"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  GraduationCap,
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
  const { theme, setTheme } = useTheme();
  return (
    <div className="console-app">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      {!focused && (
        <header className="console-nav">
          <Link className="brand" href="/" aria-label="Conselho de Classe · Início">
            <span className="brand-icon">
              <GraduationCap />
            </span>
            <span>
              Conselho
            </span>
          </Link>
          <nav aria-label="Navegação principal">
            <Button variant="ghost" aria-label="Busca" onClick={() => cmd.setOpen(true)}>
              <Search />
              <span>Busca</span>
            </Button>
            <Button variant="ghost" aria-label="Menu" onClick={() => setMenu(true)}>
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
            <DialogTitle>Menu do Conselho</DialogTitle>
            <DialogDescription>
              Arquivos, cópias de segurança e aparência.
            </DialogDescription>
          </DialogHeader>
          <Button asChild size="lg">
            <Link href="/importar" onClick={() => setMenu(false)}>
              <Upload /> Importar dados
            </Link>
          </Button>
          <Button asChild variant="outline"><Link href="/backup" onClick={()=>setMenu(false)}>Backup e restauração</Link></Button>
          <h2 className="text-lg font-semibold mt-4 text-center">Aparência</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { value: "dark", name: "Escuro", icon: Moon },
              { value: "light", name: "Claro", icon: Sun },
              { value: "system", name: "Sistema", icon: Monitor },
            ].map(({ value, name, icon: Icon }) => (
              <Button
                key={value}
                aria-pressed={theme === value}
                variant={theme === value ? "secondary" : "outline"}
                onClick={() => setTheme(value)}
              >
                <Icon />
                {name}
              </Button>
            ))}
          </div>
          <p className="supporting-text text-center">Seus dados ficam neste navegador.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
