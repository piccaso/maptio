import { Subscription } from "rxjs/Subscription";
import { LoaderService } from "./../shared/services/loading/loader.service";
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from "@angular/router";
import {
  Component,
  ViewChild,
  ChangeDetectionStrategy
} from "@angular/core";
import { HelpComponent } from "../components/help/help.component";
import "rxjs/add/operator/map"
import { Auth } from "../shared/services/auth/auth.service";
@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  changeDetection : ChangeDetectionStrategy.OnPush
})

export class AppComponent {

  public isHome: boolean;
  public isMap: boolean;

  public routerSubscription: Subscription;

  @ViewChild("help")
  helpComponent: HelpComponent;

  constructor(public auth: Auth, private router: Router, private loaderService: LoaderService) {

    this.routerSubscription = this.router.events
      .subscribe((event) => {
        // console.log(event)
        if (event instanceof NavigationStart) {
          this.isHome = this.isUrlHome(event.url)
          this.isMap = this.isUrlMap(event.url);
          // (<any>window).Intercom("update");
          this.loaderService.show();
        }
        else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel
        ) {
          this.isHome = this.isUrlHome(event.url)
          this.loaderService.hide();
        }

        if (event instanceof NavigationError) {
          this.loaderService.hide();
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) this.routerSubscription.unsubscribe()
  }

  isUrlHome(url: string): boolean {
    return url.startsWith("/home") || url === "/";
  }

  isUrlMap(url: string): boolean {
    return url.startsWith("/map")
  }

  // ngOnInit() {

  // }

  // ngAfterViewInit() {

  // }

  // ngAfterViewChecked() {
  //   (<any>window).Intercom("boot", {
  //     app_id: "rktylk1k"
  //   });
  // }

}


