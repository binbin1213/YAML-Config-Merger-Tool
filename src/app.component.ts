
import { Component, HostListener, signal } from '@angular/core';
import { ConfigMergerComponent } from './components/config-merger.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ConfigMergerComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  protected readonly helpOpen = signal(false);

  protected openHelp(): void {
    this.helpOpen.set(true);
  }

  protected closeHelp(): void {
    this.helpOpen.set(false);
  }

  protected toggleHelp(): void {
    this.helpOpen.update(v => !v);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.helpOpen()) this.closeHelp();
  }
}
