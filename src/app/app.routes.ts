import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { NoteComponent } from './pages/note/note.component';

export const routes: Routes = [
    { path: '', redirectTo: '/notes', pathMatch: 'full' },
    { path: 'home', redirectTo: '/notes', pathMatch: 'full' },
    { path: 'login',    component: LoginComponent,      data: { label: 'page.label.login', noLogin: true } },
    { path: 'settings', component: SettingsComponent,   data: { label: 'page.label.settings' } },
    { path: 'notes', children: [
      { path: '',        component: HomeComponent,  data: { label: 'page.label.notes' } },
      { path: ':noteId', component: NoteComponent,  data: { label: 'page.label.notes' } },
    ]},
  ];
