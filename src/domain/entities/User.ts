export class User {
    constructor(
        public id: string,
        public tenantId: string,
        public name: string,
        public email: string,
        public password: string,
        public role: string = "admin",
        public createdAt: string = new Date().toISOString()
    ) { }
}
