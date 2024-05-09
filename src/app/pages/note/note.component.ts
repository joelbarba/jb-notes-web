import { Component, ViewEncapsulation } from '@angular/core';
import { DocumentReference, Firestore, Unsubscribe, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from '@angular/fire/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, Subscription, SubscriptionLike, combineLatest, debounceTime, map, of, tap } from 'rxjs';
import { INote, INotebook } from '../../core/common/interfaces';
import { CommonModule } from '@angular/common';
import { BfConfirmService, BfGrowlModule, BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { DataService } from '../../core/data.service';

type IExtNotebook = INotebook & { icon: string };
type TCheckItem = {
  checked: boolean;
  text: string;
}


@Component({
  selector: 'app-note',
  standalone: true,
  imports: [
    CommonModule,
    BfUiLibModule,
    BfGrowlModule,
  ],
  templateUrl: './note.component.html',
  styleUrl: './note.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class NoteComponent {
  noteDoc!: DocumentReference;
  note!: INote;
  noteChange$ = new Subject();

  unsubscribe?: Unsubscribe;
  changeSub?: Subscription;

  notebooks$!: Observable<IExtNotebook[]>;
  allNotes$!: Observable<any[]>;

  editMode = false;
  fontSize = 16;
  currentFont = 'verdana';
  fonts = [
    { id: 'monospace' },
    { id: 'verdana' },
    { id: 'system-ui' },
    { id: 'times-new-roman' },
    { id: 'arial' },
    { id: 'sans-serif' },
  ];

  checkList: TCheckItem[] = [];

  constructor(
    private firestore: Firestore,
    private route: ActivatedRoute,
    public router: Router,
    public data: DataService,
    public growl: BfGrowlService,
    private confirm: BfConfirmService,
  ) {}

  async ngOnInit() {
    await this.data.initPromise;

    this.notebooks$ = this.data.notebooks$.pipe(map(notebooks => notebooks.map(n => {
      return { ...n, icon: 'icon-book' };
    })));

    this.allNotes$ = combineLatest([
      this.data.notebooks$,
      this.data.notes$.pipe(map(notes => notes.map(n => ({ id: n.id, title: n.title, notebookId: n.notebookId }))))
    ]).pipe(map(([notebooks, allNotes]) => notebooks.map(notebook => {
        return { ...notebook, isExp: true, notes: allNotes.filter(n => n.notebookId === notebook.id) };
      })
    ));

    this.changeSub = this.noteChange$.pipe(
      tap(_ => this.note.$saved = 'saving'),
      debounceTime(1500),
    ).subscribe(note => this.updateContent());
    
    this.loadNote();
  }

  ngOnDestroy() {
    if (this.unsubscribe) { this.unsubscribe(); }
    if (this.changeSub) { this.changeSub.unsubscribe(); }
  }



  loadNote() {
    const id = this.route.snapshot.paramMap.get('noteId') as string;
    this.noteDoc = doc(this.firestore, 'notes', id);
    console.log('Loading NOTE: ', id);

    if (this.unsubscribe) { this.unsubscribe(); }

    this.unsubscribe = onSnapshot(this.noteDoc, doc => {
      if (!doc) { return; }
      const source = doc.metadata.hasPendingWrites ? 'local' : 'server';      
      console.log(new Date(), 'note has been updated', source);

      let firstLoad = !this.note || this.note.id !== doc.id;

      if (firstLoad) { // Fist time we load the note on the page
        this.note = { ...doc.data() } as INote;
        this.note.id = doc.id;
        this.note.$saved = 'yes';
        this.data.updateLastNote(this.note.id);  // Mark this note as the last visited
        if (!this.note.mode) { this.note.mode = 'text'; }
        if (this.note.mode === 'list') { this.turnTextToCheckList(); }
        if (this.note.title === 'New Note') { this.editMode = true; } // when creating new note, edit by default

      } else { // Updating note's content while on the page        
        if (source === 'server' && this.note?.$saved === 'yes') { 
          this.note = { ...this.note, ...doc.data() }; 
          if (this.note.mode === 'list') { this.turnTextToCheckList(); }
        }
      }

    });
  }

  contentChange(value: string) {
    this.note.content = value;
    this.noteChange$.next(this.note);
    if (this.note.mode === 'list') { this.turnTextToCheckList(); }
  }

  updateContent() {
    if (this.note) {      
      const data = {
        mode: this.note.mode, 
        content: this.note.content, 
        updated: this.data.getCurrentTime()
      };
      updateDoc(this.noteDoc, data).then(() => this.note.$saved = 'yes');
    }
  }

  checkUpdate(item: TCheckItem, newValue: boolean) {
    console.log(item, newValue);
    item.checked = newValue;
    const content = this.formatListToText();
    this.contentChange(content);
  }


  changeListMode(listMode: boolean) {
    console.log('changeMode', listMode);
    if (this.note.mode === 'text' && listMode) {
      this.turnTextToCheckList();
      this.note.content = this.formatListToText();
      this.note.mode = 'list';
      this.noteChange$.next(this.note);
      
    } else if (this.note.mode === 'list' && !listMode)  {
      this.note.content = this.formatListToText();
      this.note.mode = 'text';
      this.noteChange$.next(this.note);
    }
  }

  turnTextToCheckList() {
    const lines = this.note.content.split(`\n`);
    this.checkList = [];
    let text = lines[0];

    for (let t = 1; t < lines.length; t++) {
      const line = lines[t];
      if (line[0] !== '-') {
        text += `\n` + line;

      } else {
        this.checkList.push(this.formatCheckLineText(text));
        text = line;
      }
    }
    this.checkList.push(this.formatCheckLineText(text));
  }

  formatCheckLineText(text: string): TCheckItem {
    if (text[0] !== '-') { return { checked: false, text }; }
    let i = 1;
    if (text[i] === ' ') { i++; } // Ignore space after '- '
    if (text.slice(i, i + 4) === '[ ] ') { return { checked: false, text: text.slice(i + 4) }; }
    if (text.slice(i, i + 4) === '[X] ') { return { checked: true,  text: text.slice(i + 4) }; }
    if (text.slice(i, i + 4) === '[x] ') { return { checked: true,  text: text.slice(i + 4) }; }
    if (text.slice(i, i + 3) === '[ ]')  { return { checked: false, text: text.slice(i + 3) }; }
    if (text.slice(i, i + 3) === '[X]')  { return { checked: true,  text: text.slice(i + 3) }; }
    if (text.slice(i, i + 3) === '[x]')  { return { checked: true,  text: text.slice(i + 3) }; }
    if (text.slice(i, i + 3) === '[] ')  { return { checked: false, text: text.slice(i + 3) }; }
    if (text.slice(i, i + 2) === '[]')   { return { checked: false, text: text.slice(i + 2) }; }

    return { checked: false, text: text.slice(i) };
  }

  formatListToText() {
    return this.checkList.map(item => `-${item.checked ? ' [X]' : ''} ${item.text}`).join(`\n`);
  }


  async moveNotebook(notebookId: string) {
    console.log('Moving note to notebook', notebookId);
    this.note.notebookId = notebookId;
    this.note.$saved = 'saving';

    const data = { notebookId: this.note.notebookId, updated: this.data.getCurrentTime() };
    await updateDoc(this.noteDoc, data);
    
    if (this.data.config.notebookId) { await this.data.selectNotebook(notebookId); }
    
    this.note.$saved = 'yes';
    this.growl.success(`Note moved to notebook ${notebookId}`);
  }

  isCopying = false;
  onKeydown(ev: KeyboardEvent) {
    // console.log(ev.code);

    // Async function to get the current text and line info
    const getCurrentLine = (callback: (htmlEl: HTMLTextAreaElement, 
      selIni: number, selEnd: number, selectedText: string, lineIni: number, lineEnd: number, lineText: string,
    ) => void) => {
      setTimeout(() => {
        const htmlEl = ev.target as HTMLTextAreaElement;
        const selIni = htmlEl.selectionStart;
        const selEnd = htmlEl.selectionEnd;
        const selectedText = this.note.content.slice(selIni, selEnd);
        let lineIni = selEnd - 1;
        let lineEnd = selEnd;
        while (this.note.content.at(lineIni) !== `\n` && lineIni >= 0) { lineIni--; }
        while (this.note.content.at(lineEnd) !== `\n` && lineEnd < this.note.content.length) { lineEnd++; }
        const lineText = `\n` + this.note.content.slice(lineIni + 1, lineEnd);
        callback(htmlEl, selIni, selEnd, selectedText, lineIni, lineEnd, lineText);
      });
    };


    // Ctrl + D --> Copy line or selection
    if (ev.ctrlKey && ev.code === 'KeyD' && !this.isCopying) {
      this.isCopying = true;
      getCurrentLine((htmlEl, selIni, selEnd, selectedText, lineIni, lineEnd, lineText) => {
        if (selectedText === '') { // Copy current line below
          const contArr = this.note.content.split('');
          contArr.splice(lineEnd, 0, lineText);
          this.contentChange(contArr.join(''));
          setTimeout(() => {
            htmlEl.selectionStart = selIni + lineText.length;
            htmlEl.selectionEnd = htmlEl.selectionStart;
            this.isCopying = false;
          });

        } else { // Copy selection right after it
          const contArr = this.note.content.split('');
          contArr.splice(selEnd, 0, selectedText);
          this.contentChange(contArr.join(''));
          setTimeout(() => {
            htmlEl.selectionStart = selEnd;
            htmlEl.selectionEnd = selEnd + selectedText.length;
            this.isCopying = false;
          });
        }
      });
      ev.preventDefault();
    }

    // Ctrl + Up/Down ---> Move line
    if (ev.ctrlKey && ev.shiftKey && (ev.code === 'ArrowUp' || ev.code === 'ArrowDown')) {
      this.isCopying = true;
      ev.preventDefault();
      getCurrentLine((htmlEl, selIni, selEnd, selectedText, lineIni, lineEnd, lineText) => {
        if (selectedText === '') {
          const contArr = this.note.content.split('\n');
          const lineNoBreak = lineText.split(`\n`).join('');
          const lineIndex = contArr.indexOf(lineNoBreak);
          const key = ev.code === 'ArrowUp' ? 'up' : 'down';

          if ((key === 'up' && lineIndex > 0) || (key === 'down' && lineIndex < contArr.length - 1)) {
            let newPos = selIni;
            if (key === 'up')   { newPos -= contArr[lineIndex - 1].length + 1; }
            if (key === 'down') { newPos += contArr[lineIndex + 1].length + 1; }

            contArr.splice(lineIndex, 1); // remove selected line
            if (key === 'up')   { contArr.splice(lineIndex - 1, 0, lineNoBreak); } // add it above
            if (key === 'down') { contArr.splice(lineIndex + 1, 0, lineNoBreak); } // add it below
            this.contentChange(contArr.join('\n'));
            setTimeout(() => {
              htmlEl.selectionStart = newPos;
              htmlEl.selectionEnd = newPos;
              this.isCopying = false;
            });
          } else { this.isCopying = false; }
        } else { this.isCopying = false; }
      });
    } 

    // Ctrl + S ---> Save
    if (ev.ctrlKey && ev.code === 'KeyS' && !this.isCopying) {
      this.noteChange$.next(this.note.content);
      ev.preventDefault();
    }
  }

  revertLines() {
    const noteLines = this.note.content.split(`\n`);
    console.log(noteLines);
    this.note.content = (noteLines.reverse()).join(`\n`);
    console.log(this.note.content);
  }



  async saveNote() {
    // console.log(new Date(), 'saving note', this.note);
    if (this.note) {
      this.note.$saved = 'saving';
      const updatedNote = {
        title      : this.note.title,
        order      : this.note.order,
        mode       : this.note.mode,
        content    : this.note.content,
        updated    : this.data.getCurrentTime(),
        notebookId : this.note.notebookId,
      };
      await updateDoc(this.noteDoc, updatedNote);
      this.note.$saved = 'yes';
      this.editMode = false;
    }
  }

  selectNote(noteId: string) {
    this.router.navigate(['notes/', noteId]).then(() => this.loadNote());
  }

  createNewNote() {
    this.data.createNewNote().then(docRef => {
      this.growl.success(`New Note created`);
      this.router.navigate(['notes/', docRef.id]).then(() => this.loadNote());
    });
  }

  deleteNote() {
    this.confirm.open({
      title            : 'Delete Note',
      htmlContent      : `<h4 class="marT20">You want to delete the note <span class="bold warning">"${this.note.title}"</span> ?</h4>`,
      yesButtonText    : 'Yes, delete it',
    }).then((res) => {
      if (res === 'yes') {
        deleteDoc(this.noteDoc).then(() => {
          this.growl.success(`Note deleted`);
          this.router.navigate(['notes']);
        });
      }
    }, _ => {});

  }

}
