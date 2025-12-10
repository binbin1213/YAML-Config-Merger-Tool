
import { Component } from '@angular/core';
import { ConfigMergerComponent } from './components/config-merger.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ConfigMergerComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
