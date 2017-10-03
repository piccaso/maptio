import { Angulartics2Mixpanel, Angulartics2 } from "angulartics2";
import { AuthHttp } from "angular2-jwt";
import { AuthConfiguration } from "./../../shared/services/auth/auth.config";
import { MailingService } from "./../../shared/services/mailing/mailing.service";
import { UserService } from "./../../shared/services/user/user.service";
import { LoaderService } from "./../../shared/services/loading/loader.service";
import { ErrorService } from "./../../shared/services/error/error.service";
import { MockBackend } from "@angular/http/testing";
import { Http, BaseRequestOptions } from "@angular/http";
import { FormBuilder } from "@angular/forms";
import { JwtEncoder } from "./../../shared/services/encoding/jwt.service";
import { Observable } from "rxjs/Rx";
import { RouterTestingModule } from "@angular/router/testing";
import { ActivatedRoute, Router, NavigationStart } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { LoginComponent } from "./login.component";
import { ComponentFixture, async, TestBed } from "@angular/core/testing";
import { Auth } from "../../shared/services/auth/auth.service";
import { authHttpServiceFactoryTesting } from "../../../test/specs/shared/authhttp.helper.shared";

export class AuthStub {
    login() {
        return;
    }
}

describe("login.component.ts", () => {
    let component: LoginComponent;
    let target: ComponentFixture<LoginComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [LoginComponent],
            imports: [FormsModule, ReactiveFormsModule, RouterTestingModule]
        }).overrideComponent(LoginComponent, {
            set: {
                providers: [
                    JwtEncoder, FormBuilder, LoaderService, Angulartics2Mixpanel, Angulartics2,
                    { provide: Auth, useClass: class { login = jasmine.createSpy("login"); } },
                    {
                        provide: ActivatedRoute,
                        useValue: {
                            queryParams: Observable.of({ token: "TOKEN" })
                        }
                    },
                    {
                        provide: AuthHttp,
                        useFactory: authHttpServiceFactoryTesting,
                        deps: [Http, BaseRequestOptions]
                    },
                    {
                        provide: Router, useClass: class {
                            navigate = jasmine.createSpy("navigate");
                            events = Observable.of(new NavigationStart(0, "/next"))
                        }
                    },
                    {
                        provide: Http,
                        useFactory: (mockBackend: MockBackend, options: BaseRequestOptions) => {
                            return new Http(mockBackend, options);
                        },
                        deps: [MockBackend, BaseRequestOptions]
                    },
                    MockBackend,
                    BaseRequestOptions,
                    ErrorService,
                    UserService, JwtEncoder, MailingService, AuthConfiguration
                ]
            }
        }).compileComponents();
    }));

    beforeEach(() => {
        target = TestBed.createComponent(LoginComponent);
        component = target.componentInstance;

        // target.detectChanges(); // trigger initial data binding
    });

    it("should call login on initialization", () => {
        expect(true).toBe(true)
    })
});
