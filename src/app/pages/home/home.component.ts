import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BfUiLibModule } from 'bf-ui-lib';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BfLang, BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { BehaviorSubject, Observable, Subject, combineLatest, map, take } from 'rxjs';
import { Firestore, getDocs, query, collection, collectionData, onSnapshot, where } from '@angular/fire/firestore';
import { DataService } from '../../core/data.service';
import { INotebook } from '../../core/common/interfaces';
import { Router } from '@angular/router';

export interface INote {
  id?: string;
  title: string;
  content: string;
  order: number;
  mode: 'text' | 'list';
  updated: any;
  created: any;
  notebookId?: string;
  $saved?: 'yes' | 'no' | 'saving';  // set to false while typing into the textarea, and true when saved to DB 
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
})
export class HomeComponent {
  list$ !: Observable<INote[]>;
  
  
  constructor(
    private translate: TranslateService,
    private appTranslate: AppTranslateService,
    public data: DataService,
    public router: Router,
  ) {    
  }


  ngOnInit() {
    this.data.initPromise.then(() => {
      this.list$ = combineLatest([this.data.notes$, this.data.selNotebookId$])
        .pipe(map(([notes, notebookId]) => {
          return notes.filter(note => (note.notebookId === notebookId) || notebookId === 'all') as INote[];
      }));
    });
  }

  selectNote(note: INote) {
    this.router.navigate(['notes/', note.id]);
  }

  selectNotebook(notebook?: INotebook) {
    this.data.selectNotebook(notebook?.id || 'all');
  }

  createNewNote() {
    this.data.createNewNote().then(docRef => this.router.navigate(['notes/', docRef.id]));
  }


}
