import { environment } from "./../../../environment/environment";
import { UserService } from "./../../shared/services/user/user.service";
import { ErrorService } from "./../../shared/services/error/error.service";
import { Auth } from "./../../shared/services/auth/auth.service";
import { Subscription } from "rxjs/Rx";
import { User } from "./../../shared/model/user.data";
import { Component } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { Cloudinary } from "@cloudinary/angular-4.x";
import { FileUploaderOptions, FileUploader, ParsedResponseHeaders } from "ng2-file-upload";

@Component({
    selector: "account",
    templateUrl: "./account.component.html",
    styleUrls: ["./account.component.css"]
})
export class AccountComponent {

    public user: User;
    public subscription: Subscription;
    public accountForm: FormGroup;
    public errorMessage: string;
    public feedbackMessage: string;

    public firstname: string;
    public lastname: string;
    private uploader: FileUploader;
    public isRefreshingPicture: boolean;

    constructor(public auth: Auth, public errorService: ErrorService, private userService: UserService,
        private cloudinary: Cloudinary) {
        this.accountForm = new FormGroup({
            "firstname": new FormControl(this.firstname, [
                Validators.required
            ]),
            "lastname": new FormControl(this.firstname, [
                Validators.required
            ])
        });
    }

    ngOnInit() {
        this.subscription = this.auth.getUser().subscribe((user: User) => {
            this.user = user;
            console.log(user)
            this.firstname = user.firstname;
            this.lastname = user.lastname;
        },
            (error: any) => { this.errorService.handleError(error) });

        const uploaderOptions: FileUploaderOptions = {
            url: `https://api.cloudinary.com/v1_1/${this.cloudinary.config().cloud_name}/upload`,
            // Upload files automatically upon addition to upload queue
            autoUpload: true,
            // Use xhrTransport in favor of iframeTransport
            isHTML5: true,
            // Calculate progress independently for each uploaded file
            removeAfterUpload: true,
            // XHR request headers
            headers: [
                {
                    name: "X-Requested-With",
                    value: "XMLHttpRequest"
                }
            ]
        };



        this.uploader = new FileUploader(uploaderOptions);
        this.uploader.onBuildItemForm = (fileItem: any, form: FormData): any => {
            // Add Cloudinary's unsigned upload preset to the upload form
            form.append("upload_preset", this.cloudinary.config().upload_preset);
            // Add built-in and custom tags for displaying the uploaded photo in the list
            form.append("context", `user_id=${encodeURIComponent(this.user.user_id)}`);
            form.append("tags", environment.CLOUDINARY_PROFILE_TAGNAME);
            form.append("file", fileItem);

            // Use default "withCredentials" value for CORS requests
            fileItem.withCredentials = false;
            return { fileItem, form };
        };

        this.uploader.onCompleteItem = (item: any, response: string, status: number, headers: ParsedResponseHeaders) => {
            this.userService.updateUserPictureUrl(this.user.user_id, JSON.parse(response).secure_url)
                .then((hasUpdated: boolean) => {
                    if (hasUpdated) {
                        this.auth.getUser();
                    }
                    else
                        return Promise.reject("Can't update your profile picture.")
                }, (reason) => { this.errorMessage = reason })
                .then(() => { this.isRefreshingPicture = false })
        }

        this.uploader.onProgressItem = (fileItem: any, progress: any) => {
            this.isRefreshingPicture = true
        }


    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    save() {
        if (this.accountForm.dirty && this.accountForm.valid) {
            let firstname = this.accountForm.controls["firstname"].value;
            let lastname = this.accountForm.controls["lastname"].value;

            this.userService.updateUserProfile(this.user.user_id, firstname, lastname)
                .then((hasUpdated: boolean) => {
                    if (hasUpdated) {
                        this.auth.getUser();
                        this.feedbackMessage = "Successfully updated."
                    }
                    else
                        return Promise.reject("Can't update your user information.")
                }, (reason) => { this.errorMessage = reason })

        }
    }



}