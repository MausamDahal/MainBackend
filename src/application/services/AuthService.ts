import type { UserRepository } from "../../domain/repositories/UserRepository";
import { BcryptHasher } from "../../infrastructure/security/BcryptHasher";
import { JWT } from "../../infrastructure/security/JWT";

export class AuthService {
    constructor(private userRepository: UserRepository) { }

    async signIn(email: string, password: string) {
        const user = await this.userRepository.findByEmail(email);
        if (!user || !(await BcryptHasher.compare(password, user.password))) {
            throw new Error("Invalid credentials");
        }

        const token = JWT.sign({ userId: user.id, tenantId: user.tenantId });
        return { message: "Login successful", token };
    }
}
