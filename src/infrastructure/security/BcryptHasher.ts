import bcrypt from "bcryptjs";

export class BcryptHasher {
    static async hash(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    static async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}
