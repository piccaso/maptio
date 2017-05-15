import { Params } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamFactory } from './../../shared/services/team.factory';
import { Component, Input, ViewChild, OnInit } from "@angular/core";
import { ModalComponent } from "ng2-bs3-modal/ng2-bs3-modal";
import { Initiative } from "../../shared/model/initiative.data"
import { Team } from "../../shared/model/team.data"
import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/map";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";
import { NgbTypeaheadSelectItemEvent } from "@ng-bootstrap/ng-bootstrap";
import { User } from "../../shared/model/user.data";



@Component({
    selector: "initiative",
    template: require("./initiative.component.html"),
    providers: [Initiative]
})

export class InitiativeComponent {



    @ViewChild("initiativeModal")
    modal: ModalComponent;

    @Input() data: Initiative;
    // @Input() team: Team;

    public team: Team;

    isTeamMemberFound: boolean = true;
    isTeamMemberAdded: boolean = false;
    currentTeamName: string;


                                  constructor(private teamFactory: TeamFactory) {

    }

    // ngOnInit(): void {
    //     this.route.params.subscribe((params: Params) => {
    //         let datasetId = params["workspaceid"];
    //         this.router.navigate(["workspace", datasetId]);
    //     }
    //     );
    // }

    open() {
        this.modal.open();
        this.teamFactory.get(this.data.team_id).then((team: Team) => {
                                                           this.team = team;
                                    }).catch(err => { })
    }

    saveName(newName: any) {
        this.data.name = newName;
    }

    saveDescription(newDesc: string) {
        this.data.description = newDesc;
    }

    saveStartDate(newDate: string) {
        let year = Number.parseInt(newDate.substr(0, 4));
        let month = Number.parseInt(newDate.substr(5, 2));
        let day = Number.parseInt(newDate.substr(8, 2));
                                          let parsedDate = new Date(year, month, day);

        // HACK : this should not be here but in a custom validatpr. Or maybe use HTML 5 "pattern" to prevent binding
        if (!Number.isNaN(parsedDate.valueOf())) {
            this.data.start = new Date(year, month, day);
        }
    }

    saveAccountable(newAccountable: NgbTypeaheadSelectItemEvent) {
        this.data.accountable = newAccountable.item
    }

    isHelper(user: User): boolean {
        if (!this.data) return false;
        if (!this.data.helpers) return false;
        if (!user.user_id) return false;
        return this.data.helpers.findIndex(u => { return u.user_id === user.user_id }) !== -1
    }

    addHelper(newHelper: User, checked: boolean) {
        if (checked) {
            this.data.helpers.push(newHelper);
        }
        else {
            let index = this.data.helpers.findIndex(user => user.user_id === newHelper.user_id);
            this.data.helpers.splice(index, 1);
        }
    }


    searchTeamMember =
    (text$: Observable<string>) =>
        text$
            .debounceTime(200)
            .distinctUntilChanged()
            .map(term => {
                try {
                    this.isTeamMemberAdded = false;
                    this.currentTeamName = term;
                    let results = term.length < 1 ? (<Team>this.team).members : (<Team>this.team).members.filter(v => new RegExp(term, "gi").test(v.name)).splice(0, 10);
                    this.isTeamMemberFound = (results !== undefined && results.length !== 0) ? true : false;
                    return results;
                }
                catch (Exception) {
                    this.isTeamMemberFound = false;
                }
            });

    formatter = (result: User) => result.name;
}




