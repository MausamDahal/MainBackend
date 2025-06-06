import { Tenant } from "../entities/Tenant";

export interface TenantRepository {
    create(tenant: Tenant): Promise<Tenant>;
    findByEmail(email: string): Promise<Tenant | null>;
    findBySubdomain(subdomain: string): Promise<Tenant | null>;
}
