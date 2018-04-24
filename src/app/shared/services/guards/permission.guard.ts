import { Observable } from 'rxjs/Observable';
import { Permissions } from './../../model/permission.data';
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot } from "@angular/router";
import { CanActivate, CanActivateChild, RouterStateSnapshot, Router } from "@angular/router";
import { Auth } from "../auth/auth.service";

@Injectable()
export class PermissionGuard implements CanActivate, CanActivateChild {

    constructor(private auth: Auth, private router: Router) {

    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        // console.log(route, route.data);
        let userPermissions = this.auth.getPermissions();
        route.data.permissions.forEach((required: Permissions) => {
            if (!userPermissions.includes(required)) {
                this.router.navigate(["/unauthorized"])
            }
        });

        return Observable.of(true);
    }

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.canActivate(childRoute, state);
    }

}