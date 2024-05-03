import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { BfGrowlService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { BfAvatarComponent } from '../../core/common/internal-lib/bf-avatar/bf-avatar.component';
import { AuthService } from '../../core/common/auth.service';
import { DataService } from '../../core/data.service';
// import { SubSink } from 'subsink';

@Component({
  selector: 'bf-app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    TranslateModule,
    CommonModule,
    BfUiLibModule,
    BfAvatarComponent,
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  // private subs = new SubSink();
  isLoggedIn = false;
  profileImageUrl?: string;
  isProfileExpanded = false;
  languages!: BfLangList;
  localeId$ = this.appTranslate.localeId$;
  language$ = this.appTranslate.language$;
  lang = '';
  displayName = '';
  darkMode = false;


  constructor(
    public readonly auth: AuthService,
    public readonly appTranslate: AppTranslateService,
    public data: DataService,
    private growl: BfGrowlService,
  ) {
  }

  ngOnInit() {
    this.auth.profile$.subscribe(profile => this.isLoggedIn = !!profile); // Every time the auth session changes
    this.auth.profilePromise.then(profile => this.displayName = profile.displayName); // First time a valid profile loads
    
    this.data.initPromise.then(config => {
      this.darkMode = config.darkMode;
    });
    

    this.appTranslate.languagesPromise.then(langs => {
      this.languages = langs;
      this.lang = this.appTranslate.currentLanguage;
      // console.log(langs);
    });
  }

  ngOnDestroy() {}
  // ngOnDestroy() { this.subs.unsubscribe(); }

  selectLang(code: string) {
    this.appTranslate.changeLanguage(code);
  }


  toggleProfile() {
    this.isProfileExpanded = !this.isProfileExpanded;
  }

  updateProfile() {
    this.auth.updateProfile({ displayName: this.displayName }).then(() => {
      this.growl.success('Profile name updated');
    });
  }

  changeDarkMode(ev: boolean) {
    this.data.changeDarkMode(ev).then(() => {
      this.growl.success(`Dark mode ${ev ? 'on' : 'off'}`);
    });    
  }
}
