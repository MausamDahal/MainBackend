import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import tenantRoutes from "./interfaces/routes/tenantRoutes";
import jwt from "jsonwebtoken";
import subscriptionRoutes from "./interfaces/routes/subscriptionRoutes";
const PORT: any = process.env.PORT || 3000;


const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [/\.nestcrm\.com\.au$/, 'https://nestcrm.com.au', 'https://www.nestcrm.com.au'];
        if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use("/api/tenants", tenantRoutes);

app.post('/api/logout', (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "https://nestcrm.com.au");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    res.cookie("token", "", {
        domain: ".nestcrm.com.au",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
    });

    // 🧼 Clear __vercel_toolbar too
    res.cookie("__vercel_toolbar", "", {
        domain: "nestcrm.com.au",
        path: "/",
        expires: new Date(0),
    });

    res.status(200).json({ message: "✅ Logged out + toolbar cleared" });
});

app.get("/api/validate", (req: Request, res: Response) => {
    const token = req.cookies.token;

    if (!token) {
        res.status(401).json({ valid: false, error: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        res.status(200).json({ valid: true, payload: decoded });
    } catch (err) {
        res.status(401).json({ valid: false, error: "Invalid or expired token" });
    }
});

app.get('/api/status', (_req: Request, res: Response) => {
    res.json({ message: 'API is working fine!' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
