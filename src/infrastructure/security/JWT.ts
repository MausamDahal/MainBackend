import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export class JWT {
    static sign(payload: object): string {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    }

    static verify(token: string): any {
        return jwt.verify(token, JWT_SECRET);
    }
}
