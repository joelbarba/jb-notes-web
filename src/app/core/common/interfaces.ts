export interface IProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  // countryCode: string;
  // timeZone: string;
}

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

export interface INotebook {
  id?: string;
  name: string;
  order: string;
}

export interface IConfig {
  lastId: string;
  darkMode: boolean;
  jumpMode: boolean;
  notebookId: string;
}