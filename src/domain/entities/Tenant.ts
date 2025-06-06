export class Tenant {
    constructor(
        public ID: string,
        public FirstName: string,
        public LastName: string,
        public CompanyName: string,
        public Email: string,
        public Subdomain: string,
        public Password: string,
        public Domain: string,
        public planId: string,
        public Status: string = "active",
        public CreatedAt: string = new Date().toISOString()
    ) { }
}
