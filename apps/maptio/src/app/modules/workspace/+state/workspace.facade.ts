import { Injectable, inject } from '@angular/core';
import { select, Store, Action } from '@ngrx/store';

// import * as WorkspaceActions from './workspace.actions';
// import * as WorkspaceFeature from './workspace.reducer';
// import * as WorkspaceSelectors from './workspace.selectors';

@Injectable()
export class WorkspaceFacade {
  private readonly store = inject(Store);

  /**
   * Combine pieces of state using createSelector,
   * and expose them as observables through the facade.
   */
  // loaded$ = this.store.pipe(select(WorkspaceSelectors.selectWorkspaceLoaded));
  // allWorkspace$ = this.store.pipe(
  //   select(WorkspaceSelectors.selectAllWorkspace)
  // );
  // selectedWorkspace$ = this.store.pipe(select(WorkspaceSelectors.selectEntity));

  /**
   * Use the initialization action to perform one
   * or more tasks in your Effects.
   */
  // init() {
  //   this.store.dispatch(WorkspaceActions.initWorkspace());
  // }
}
