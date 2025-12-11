import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface PrismGlobal {
  highlightAll(): void;
  highlightElement(element: HTMLElement): void;
  highlight(text: string, grammar: object, language: string): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  languages: Record<string, any>;
}

declare let Prism: PrismGlobal;

@Injectable({ providedIn: 'root' })
export class HighlightService {
  platformId = inject(PLATFORM_ID);


  highlightAll() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
      }
    }
  }

  highlightElement(element: HTMLElement) {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof Prism !== 'undefined') {
        Prism.highlightElement(element);
      }
    }
  }

  highlight(text: string, language: string): string {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof Prism !== 'undefined') {
        return Prism.highlight(text, Prism.languages[language], language);
      }
    }
    return text;
  }
}
