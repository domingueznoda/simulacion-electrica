import { useState } from 'react';
import { Navbar } from './components/toolbar/Navbar';
import { ComponentPalette } from './components/toolbar/ComponentPalette';
import { SchematicCanvas } from './components/canvas/SchematicCanvas';
import { DiagnosticsPanel } from './components/toolbar/DiagnosticsPanel';
import { HelpModal } from './components/modals/HelpModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

export default function App() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Navbar
        onOpenHelp={() => setIsHelpOpen(true)}
        onTogglePalette={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}
        isPaletteOpen={isMobilePaletteOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        onToggleDesktopCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <ComponentPalette
          isOpen={isMobilePaletteOpen}
          onClose={() => setIsMobilePaletteOpen(false)}
          isDesktopCollapsed={isDesktopCollapsed}
          onToggleDesktopCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        />
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <SchematicCanvas onOpenPalette={() => setIsMobilePaletteOpen(true)} />
          <DiagnosticsPanel />
        </main>
      </div>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <OfflineIndicator />
    </div>
  );
}
