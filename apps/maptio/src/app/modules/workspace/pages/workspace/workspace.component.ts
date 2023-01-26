import { tap } from 'rxjs/operators';
import { BuildingComponent } from '../../components/data-entry/hierarchy/building.component';
import { DataService } from '../../services/data.service';
import { RoleLibraryService } from '../../services/role-library.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription, Subject } from 'rxjs';
import { Initiative } from '../../../../shared/model/initiative.data';
import { DataSet } from '../../../../shared/model/dataset.data';
import { Team } from '../../../../shared/model/team.data';
import { EmitterService } from '../../../../core/services/emitter.service';
import { DatasetFactory } from '../../../../core/http/map/dataset.factory';
import { TeamFactory } from '../../../../core/http/team/team.factory';
import { ViewChild } from '@angular/core';
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { User } from '../../../../shared/model/user.data';
import { Tag } from '../../../../shared/model/tag.data';
import { Role } from '../../../../shared/model/role.data';
import { Intercom } from 'ng-intercom';
import { Angulartics2Mixpanel } from 'angulartics2/mixpanel';

import { Store } from '@ngrx/store';

import { setCurrentOrganisationId } from '@maptio-state/current-organisation.actions';
import { MapService } from '@maptio-shared/services/map/map.service';

@Component({
  selector: 'maptio-workspace',
  templateUrl: 'workspace.component.html',
  styleUrls: ['./workspace.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  @ViewChild('building', { static: true })
  buildingComponent: BuildingComponent;

  public isBuildingPanelCollapsed = true;
  public isDetailsPanelCollapsed = true;
  public isBuildingVisible = true;
  public isEmptyMap: boolean;
  public isSaving: boolean;
  public isEditMode: boolean;
  public datasetId: string;
  private routeSubscription: Subscription;
  public isLoading: boolean;

  public dataset: DataSet;
  public members: Array<User>;
  public team: Team;
  public teams: Team[];
  public tags: Tag[];
  public user: User;
  public roles: Role[];
  public canvasYMargin: number;
  public canvasHeight: number;

  public openedNode: Initiative;
  public openedNodeParent: Initiative;
  public openedNodeTeamId: string;
  public openEditTag$: Subject<void> = new Subject<void>();

  public mapped: Initiative;
  teamName: string;
  teamId: string;
  selectableTags: Array<Tag>;

  @ViewChild('dragConfirmation')
  dragConfirmationModal: NgbModal;

  constructor(
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private store: Store,
    private datasetFactory: DatasetFactory,
    private teamFactory: TeamFactory,
    private dataService: DataService,
    private mapService: MapService,
    private roleLibrary: RoleLibraryService,
    private mixpanel: Angulartics2Mixpanel,
    private intercom: Intercom
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.cd.markForCheck();
    this.routeSubscription = this.route.data
      .pipe(
        tap((data) => {
          const newDatasetId = data.data.dataset.datasetId;
          if (newDatasetId !== this.datasetId) {
            this.isBuildingPanelCollapsed = false;
            this.isDetailsPanelCollapsed = true;
            this.cd.markForCheck();
          }
        }),
        tap(
          (data: {
            data: { dataset: DataSet; team: Team; members: User[]; user: User };
          }) => {
            this.isLoading = true;
            this.cd.markForCheck();
            return this.buildingComponent
              .loadData(data.data.dataset, data.data.team, data.data.members)
              .then(() => {
                // Hack to make sure the circle details panel stays closed...
                // TODO: Remove this when we've got good enough state
                // management here
                setTimeout(() => {
                  this.closeDetailsPanel();
                }, 100);
                this.isLoading = false;
                this.cd.markForCheck();
              });
          }
        )
      )
      .subscribe(
        (data: {
          data: { dataset: DataSet; team: Team; members: User[]; user: User };
        }) => {
          this.dataset = data.data.dataset;
          this.tags = data.data.dataset.tags;
          this.team = data.data.team;
          this.members = data.data.members;
          this.user = data.data.user;
          this.datasetId = this.dataset.datasetId;
          this.teamName = this.team.name;
          this.teamId = this.team.team_id;
          EmitterService.get('currentTeam').emit(this.team);

          const currentOrganisationId = this.team?.team_id;
          this.store.dispatch(
            setCurrentOrganisationId({ currentOrganisationId })
          );

          this.isEmptyMap =
            !this.dataset.initiative.children ||
            this.dataset.initiative.children.length === 0;
          this.cd.markForCheck();
        }
      );
  }

  ngOnDestroy(): void {
    EmitterService.get('currentTeam').emit(undefined);
    this.store.dispatch(
      setCurrentOrganisationId({ currentOrganisationId: undefined })
    );

    if (this.routeSubscription) this.routeSubscription.unsubscribe();
  }

  saveDetailChanges() {
    this.buildingComponent.saveChanges();
  }

  // applySettings(data: { initiative: Initiative, tags: Tag[] }) {
  //     data.initiative.traverse((node: Initiative) => {
  //         node.tags = intersectionBy(data.tags, node.tags, (t: Tag) => t.shortid);
  //     })
  //     this.saveChanges(data.initiative, data.tags);
  //     this.cd.markForCheck();
  // }

  async saveChanges(change: { initiative: Initiative; tags: Array<Tag> }) {
    const isLocalDatasetOutdated = await this.mapService.isDatasetOutdated(
      this.dataset,
      this.user
    );

    if (isLocalDatasetOutdated) {
      if (!this.mapService.hasOutdatedAlertBeenShownRecently(this.dataset)) {
        alert(
          $localize`A friendly heads-up: Your map has been changed by another user (or by you in a different browser tab). Please hit refresh to load the latest version, then you can make your edits. You can copy any text you just entered, ready to paste it in again after the refresh. Sorry for the hassle.`
        );
      }
      return;
    }

    this.isEmptyMap =
      !change.initiative.children || change.initiative.children.length === 0;
    this.isSaving = true;
    this.cd.markForCheck();

    this.dataset.initiative = change.initiative;
    this.dataset.tags = change.tags;
    this.tags = change.tags;

    let depth = 0;
    change.initiative.traverse(() => {
      depth++;
    });

    // Ensure that that the dataset and team versions of the role library are identical before saving
    const roleLibrary = this.roleLibrary.getRoles();
    this.dataset.roles = roleLibrary;
    this.team.roles = roleLibrary;

    Promise.all([
      this.datasetFactory.upsert(this.dataset, this.datasetId),
      this.teamFactory.upsert(this.team),
    ])
      .then(
        ([hasSavedDataset, hasSavedTeam]: [boolean, boolean]) => {
          this.dataService.set({
            initiative: change.initiative,
            dataset: this.dataset,
            team: this.team,
            members: this.members,
          });
          return hasSavedDataset && hasSavedTeam;
        },
        (reason) => {
          console.error(reason);
        }
      )
      .then(() => {
        this.intercom.trackEvent('Editing map', {
          team: this.team.name,
          teamId: this.team.team_id,
          datasetId: this.datasetId,
          mapName: change.initiative.name,
          circles: depth,
        });
        this.mixpanel.eventTrack('Editing map', {
          team: this.team.name,
          teamId: this.team.team_id,
          datasetId: this.datasetId,
          mapName: change.initiative.name,
          circles: depth,
        });
        return;
      })
      .then(() => {
        this.isSaving = false;
        this.cd.markForCheck();
      });
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.cd.markForCheck();
  }

  onOpenDetails(node: Initiative) {
    this.openedNode = node;
    if (this.isDetailsPanelCollapsed) this.openDetailsPanel();
    this.cd.markForCheck();
  }

  addInitiative(data: { node: Initiative; subNode: Initiative }) {
    this.buildingComponent.addNodeTo(data.node, data.subNode);
  }

  removeInitiative(node: Initiative) {
    this.buildingComponent.removeNode(node);
  }

  moveInitiative({
    node,
    from,
    to,
  }: {
    node: Initiative;
    from: Initiative;
    to: Initiative;
  }) {
    this.buildingComponent.moveNode(node, from, to);
  }

  openDetailsPanel() {
    this.isDetailsPanelCollapsed = false;
    // this.resizeMap();
    this.cd.markForCheck();
  }

  closeDetailsPanel() {
    this.isDetailsPanelCollapsed = true;
    // this.resizeMap();
    this.cd.markForCheck();
  }

  closeBuildingPanel() {
    this.isBuildingPanelCollapsed = true;
    // this.resizeMap();
    this.cd.markForCheck();
  }

  openBuildingPanel() {
    this.isBuildingPanelCollapsed = false;
    // this.resizeMap();
    this.cd.markForCheck();
  }

  toggleEditingPanelsVisibility(isVisible: boolean) {
    this.isBuildingVisible = isVisible;
    this.cd.markForCheck();
  }

  onEditTags() {
    this.isBuildingPanelCollapsed = false;
    this.buildingComponent.tabs.select('tags-tab');
    this.cd.markForCheck();
  }

  // private resizeMap() {
  //     let outerSvg = document.querySelector("svg#map");
  //     let innerSvg = document.querySelector("svg#map > svg");
  //     if (!outerSvg || !innerSvg) return;
  //     let margin = this.uiService.getCenteredMargin();
  //     innerSvg.setAttribute("x", margin);
  // }

  private isZeroPanelOpened() {
    return this.isBuildingPanelCollapsed && this.isDetailsPanelCollapsed;
  }

  private isOnePanelOpened() {
    return this.isBuildingPanelCollapsed !== this.isDetailsPanelCollapsed;
  }

  private isTwoPanelsOpened() {
    return !this.isDetailsPanelCollapsed && !this.isBuildingPanelCollapsed;
  }
}
