import { v4 as uuidv4 } from "uuid";
import type { Tenant } from "../../domain/entities/Tenant";
import { TenantRepositoryImpl } from "../../infrastructure/database/TenantRepositoryImpl";

export class TenantService {
    static async createTenant(data: any): Promise<Tenant> {
        const tenantRepo = new TenantRepositoryImpl();
        const newTenant = new Tenant({
            id: uuidv4(),
            companyName: data.companyName,
            email: data.email,
            subdomain: data.subdomain,
            domain: `${data.subdomain}.nestcrm.com.au`,
            status: "active",
            createdAt: new Date().toISOString(),
        });

        return await tenantRepo.create(newTenant);
    }

    static async findBySubdomain(subdomain: string): Promise<Tenant | null> {
        const tenantRepo = new TenantRepositoryImpl();
        return await tenantRepo.findBySubdomain(subdomain);
    }
}
