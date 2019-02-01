import { NgModule } from "@angular/core";
import { CreateMapComponent } from './components/create-map/create-map.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { ColorHueModule } from 'ngx-color/hue'; // <color-hue-picker></color-hue-picker>

import { CardMapComponent } from './components/card-map/card-map.component';
import { RouterModule } from '@angular/router';
import { OnboardingComponent } from "./components/onboarding/onboarding.component";
import { GoogleSignInComponent } from "./components/buttons/google-signin.component";
import { ColorPickerComponent } from "./components/color-picker/color-picker.component";
import { CreateTeamComponent } from "./components/create-team/create-team.component";
import { SharedModule } from "./shared.module";
import { CardTeamComponent } from "./components/card-team/card-team.component";
import { IntercomService } from "./services/team/intercom.service";
import { AddMemberComponent } from "./components/onboarding/add-member.component";
import { AddTerminologyComponent } from "./components/onboarding/add-terminology.component";
import { ConfirmationPopoverModule } from "../../../node_modules/angular-confirmation-popover";
import { CommonModalComponent } from "./components/modal/modal.component";
import { InstructionsComponent } from "./components/instructions/instructions.component";
import { NgbTooltipModule, NgbModalModule, NgbPopoverModule } from "@ng-bootstrap/ng-bootstrap";
import { SafePipe } from "../pipes/safe.pipe";



@NgModule({
    imports: [
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        RouterModule,
        ColorHueModule,
        SharedModule,
        ConfirmationPopoverModule,
        NgbTooltipModule, 
        NgbModalModule,
        NgbPopoverModule
    ],
    declarations: [
        CreateMapComponent,
        CreateTeamComponent,
        CardMapComponent,
        CardTeamComponent, 
        OnboardingComponent,
        InstructionsComponent,
        AddMemberComponent,
        AddTerminologyComponent,
        GoogleSignInComponent,
        ColorPickerComponent,
        CommonModalComponent,
        SafePipe
    ],
    providers: [
        IntercomService
    ],
    exports: [
        CreateMapComponent,
        CreateTeamComponent,
        CardMapComponent,
        CardTeamComponent,
        OnboardingComponent,
        InstructionsComponent,
        AddMemberComponent,
        AddTerminologyComponent,
        GoogleSignInComponent,
        ColorPickerComponent,
        CommonModalComponent,
        SafePipe
    ]
})
export class CommonComponentsModule { }