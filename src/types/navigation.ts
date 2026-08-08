export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Record: undefined;
  History: undefined;
  Stats: undefined;
  RecordDetail: { id: number };
  NoteHistory: { deletedId?: number } | undefined;
  NoteDetail: { id: number };
  PeopleObservation: undefined;
  PeopleObservationHistory: { deletedId?: number } | undefined;
  PeopleObservationDetail: { id: number };
};

export type MainTabsParamList = {
  Home: undefined;
  Notes: undefined;
  Observation: undefined;
  Account: undefined;
};
