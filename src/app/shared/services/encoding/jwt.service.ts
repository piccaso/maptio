import { Http } from "@angular/http";
import { Injectable } from "@angular/core";


@Injectable()
export class JwtEncoder {

    private _http: Http;
    constructor(private http: Http) {
        this._http = http;
    }

    public encode(payload: any): Promise<string> {
        return this.http.post("/api/v1/jwt/encode", payload)
            .map((responseData) => {
                return responseData.json().token;
            })
            .toPromise()
    }

    public decode(token: string): Promise<any> {
        return this.http.get("/api/v1/jwt/decode/" + token)
            .map((responseData) => {
                return responseData.json();
            })
            .toPromise()
    }
}
