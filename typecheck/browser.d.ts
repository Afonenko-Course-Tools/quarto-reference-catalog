/** Публичная часть native библиотек, которую потребляет навигация QRC. */
interface QrcCollapse {
  show(): void;
  hide(): void;
}
interface QrcBootstrap {
  Collapse: {
    getOrCreateInstance(element: Element, options?: { toggle: boolean }): QrcCollapse;
  };
}
interface QrcReveal {
  isReady(): boolean;
  getIndices(element?: Element): { h: number; v: number; f?: number };
  slide(h: number, v: number): void;
  navigateFragment(index: number): void;
  on(event: "ready", handler: () => void): void;
  next(): void;
  getCurrentSlide(): HTMLElement;
}
interface Window {
  bootstrap?: QrcBootstrap | undefined;
  Reveal?: QrcReveal | undefined;
}
declare const bootstrap: QrcBootstrap;
declare const Reveal: QrcReveal;
