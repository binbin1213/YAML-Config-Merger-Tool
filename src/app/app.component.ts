import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigMergerComponent } from './components/config-merger.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ConfigMergerComponent],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  title = 'yaml-config-merger-tool';
}