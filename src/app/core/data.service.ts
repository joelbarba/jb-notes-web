import { Inject, Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, Subject, map, take } from 'rxjs';
import { IConfig, INote, INotebook } from './common/interfaces';
import { AuthService } from './common/auth.service';
import { Firestore, addDoc, collectionData, doc, getDoc, getDocs, onSnapshot, updateDoc } from '@angular/fire/firestore';
import { collection, DocumentData, QuerySnapshot, setDoc } from 'firebase/firestore';
import { DOCUMENT } from '@angular/common';


@Injectable({ providedIn: 'root' })
export class DataService {
  notesCol = collection(this.firestore, 'notes');
  notebooksCol = collection(this.firestore, 'notebooks');
  // notes$ !: Observable<INote[]>;
  // notebooks$ !: Observable<INotebook[]>;
  notes$: BehaviorSubject<INote[]> = new BehaviorSubject([] as INote[]);
  notebooks$: BehaviorSubject<INotebook[]> = new BehaviorSubject([] as INotebook[]);

  configDoc = doc(this.firestore, 'notes', '0');

  initPromise !: Promise<IConfig>;

  lastId = '0';
  selNotebookId$ = new BehaviorSubject('');
  config: IConfig = { lastId: '0', darkMode: true, jumpMode: false, notebookId: '' };

  constructor(
    private firestore: Firestore,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.initPromise = this.auth.profilePromise.then(() => {
      this.loadNotes();
      this.loadNotebooks();
      return this.loadConfig();
    });
  }

  loadNotes() {
    // this.notes$ = collectionData(this.notesCol, { idField: 'id'}).pipe(map(data => {
    //   const notes = data.filter(n => n.id !== '0') as INote[];
    //   return notes.sort((a, b) => {
    //     if (!!a.order || !!b.order) { return (a.order || 0) > (b.order || 0) ? -1 : 1; }
    //     return a.updated > b.updated ? -1 : 1;
    //   });
    // }));

    onSnapshot(collection(this.firestore, 'notes'), (snapshot: QuerySnapshot) => {
      const notes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as INote)).filter(n => n.id !== '0');
      notes.sort((a, b) => {
        if (!!a.order || !!b.order) { return (a.order || 0) > (b.order || 0) ? -1 : 1; }
        return a.updated > b.updated ? -1 : 1;
      });
      console.log('notes', notes);
      this.notes$.next(notes);
    });
  }

  loadNotebooks() {
    // this.notebooks$ = collectionData(this.notebooksCol, { idField: 'id'}).pipe(map(notebooks => notebooks
    //   .sort((a, b) => ((a['order'] || 0) > (b['order'] || 0) ? 1 : -1)) as INotebook[]
    // ));

    onSnapshot(collection(this.firestore, 'notebooks'), (snapshot: QuerySnapshot) => {
      const notebooks = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as INotebook))
        .sort((a, b) => ((a['order'] || 0) > (b['order'] || 0) ? 1 : -1));

      console.log('notebooks', notebooks);
      this.notebooks$.next(notebooks);
    });
  }

  loadConfig() {
    return getDoc(this.configDoc).then(doc => {
      this.config = doc.data() as IConfig;
      console.log('THE CONFIG IS', this.config);

      if (this.router.url === '/home' && this.config && this.config?.lastId !== '0') {
        this.router.navigate(['/notes/' + this.config.lastId]);
      }
      this.changeDarkMode(this.config?.darkMode);
      this.selNotebookId$.next(this.config?.notebookId || 'all');
      return this.config;
    });
  }

  // formatDate(fDate: { seconds: number, nanoseconds: number }): string {
  //   const dp = (new Date(fDate.seconds * 1000) + '').split(' ');
  //   return `${dp[2]} ${dp[1]} ${dp[3]} - ${dp[4]}`;
  // }

  getNote(id: string) {
    return this.notes$.pipe(map(notes => notes.find(n => n.id === id)));
  }

  getCurrentTime() {
    return (new Date()).getTime(); // ms
    // return { seconds: Math.round((new Date()).getTime() / 1000), nanoseconds: 0, };
  }

  changeDarkMode(value = true) {
    // console.log('changeDarkMode', value);

    if (value) { this.document.body.classList.add('dark-mode'); }
    else       { this.document.body.classList.remove('dark-mode'); }

    this.config.darkMode = value;    
    return updateDoc(this.configDoc, { darkMode: this.config.darkMode });
  }

  selectNotebook(notebookId: string) {
    this.selNotebookId$.next(notebookId);
    this.config.notebookId = notebookId;
    return updateDoc(this.configDoc, { notebookId: this.config.notebookId });
  }

  updateLastNote(noteId: string) {
    this.config.lastId = noteId;
    return updateDoc(this.configDoc, { lastId: this.config.lastId });
  }

  createNewNote() {
    const newNote = {
      title: 'New Note',
      content: '',
      order: 0,
      mode: 'text',
      updated: this.getCurrentTime(),
      created: this.getCurrentTime(),
      notebookId: this.config.notebookId,
    };
    return addDoc(this.notesCol, newNote);
  }

}
