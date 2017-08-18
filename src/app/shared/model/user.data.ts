import { Serializable } from "../interfaces/serializable.interface";

export class User implements Serializable<User> {

    /**
     * Unique Id (specific to Auth0 schema)
     */
    public user_id: string;

    /**
     * User name
     */
    public name: string;

    /**
     * User nickname
     */
    public nickname: string;

    /**
     * User email
     */
    public email: string;

    /**
     * User picture URL
     */
    public picture: string;

    /**True if this is a virtual user, false otherwise */
    public isVirtual: boolean;

    /**
     * List of teams
     */
    public teams: any[];

    /**
     * List of datasets
     */
    public datasets: any[];

    public constructor(init?: Partial<User>) {
        Object.assign(this, init);
    }


    static create(): User {
        return new User();
    }

    deserialize(input: any): User {
        if (!input.user_id) {
            return undefined;
        }
        let deserialized = new User();
        deserialized.name = input.name;
        deserialized.nickname = input.nickname;
        deserialized.email = input.email;
        deserialized.picture = input.picture;
        deserialized.user_id = input.user_id; // specific to Auth0
        deserialized.isVirtual = input.isVirtual;
        deserialized.teams = [];
        if (input.teams) {
            input.teams.forEach((t: any) => {
                deserialized.teams.push(t);
            });
        }
        deserialized.datasets = []
        if (input.datasets) {
            input.datasets.forEach((d: any) => {
                deserialized.datasets.push(d);
            });
        }
        return deserialized;
    }

    tryDeserialize(input: any): [boolean, User] {
        try {
            let user = this.deserialize(input);
            if (user !== undefined) {
                return [true, user];
            }
            else {
                return [false, undefined]
            }
        }
        catch (Exception) {
            return [false, undefined]
        }
    }
}