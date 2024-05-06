import { Component, Inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shell/navbar/navbar.component';
import { MenuComponent } from './shell/menu/menu.component';
import { BfGrowlModule } from 'bf-ui-lib';
import { DataService } from './core/data.service';
import { DOCUMENT } from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    MenuComponent,
    BfGrowlModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  constructor(
    public data: DataService,
    @Inject(DOCUMENT) private document: Document
  ) {}
  
  async ngOnInit() {
    await this.data.initPromise;
    // const dark = this.data.config.darkMode;
    // if (dark) { this.document.body.classList.add('dark-mode'); }
    // else      { this.document.body.classList.remove('dark-mode'); }
  }


}
