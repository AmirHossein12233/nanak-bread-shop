const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 3001;

const ROOT = __dirname;

const ORDERS_FILE = path.join(ROOT, "orders.json");
const SALES_FILE = path.join(ROOT, "sales.json");
const PRODUCTS_FILE = path.join(ROOT, "products.json");


// ===============================
// تنظیمات مدیریت
// ===============================

const ADMIN_USERNAME = "admin";

const ADMIN_PASSWORD = "نانک1234";


// ===============================
// نشست‌های ورود
// ===============================

const sessions = new Map();

const SESSION_TIME = 1000 * 60 * 60 * 4;


// ===============================
// فایل‌های اولیه
// ===============================

function createFile(file, data) {

    if (!fs.existsSync(file)) {

        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2),
            "utf8"
        );

    }

}


createFile(
    ORDERS_FILE,
    []
);


createFile(
    SALES_FILE,
    []
);


createFile(
    PRODUCTS_FILE,
    [
        {
            id: 1,
            name: "نان خانگی کنجدی",
            price: 15000,
            available: true
        }
    ]
);


// ===============================
// خواندن JSON
// ===============================

function readJSON(file, fallback) {

    try {

        const data =
            fs.readFileSync(
                file,
                "utf8"
            );

        return JSON.parse(data);

    } catch (error) {

        return fallback;

    }

}


// ===============================
// ذخیره JSON
// ===============================

function writeJSON(file, data) {

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );

}


// ===============================
// Cookie
// ===============================

function getCookies(req) {

    const header =
        req.headers.cookie || "";

    const cookies = {};

    header
        .split(";")
        .forEach(
            function(item) {

                const parts =
                    item.trim().split("=");

                if (
                    parts.length >= 2
                ) {

                    cookies[
                        parts[0]
                    ] =
                        decodeURIComponent(
                            parts
                                .slice(1)
                                .join("=")
                        );

                }

            }
        );

    return cookies;

}


// ===============================
// ساخت Session
// ===============================

function createSession() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


// ===============================
// بررسی ورود
// ===============================

function isAuthenticated(req) {

    const cookies =
        getCookies(req);

    const sessionId =
        cookies.admin_session;

    if (!sessionId) {

        return false;

    }


    const session =
        sessions.get(
            sessionId
        );

    if (!session) {

        return false;

    }


    if (
        Date.now() -
        session.created >
        SESSION_TIME
    ) {

        sessions.delete(
            sessionId
        );

        return false;

    }


    return true;

}


// ===============================
// پاسخ JSON
// ===============================

function sendJSON(
    res,
    status,
    data
) {

    const output =
        JSON.stringify(
            data
        );

    res.writeHead(
        status,
        {
            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store"
        }
    );

    res.end(
        output
    );

}


// ===============================
// دریافت Body
// ===============================

function getBody(req) {

    return new Promise(
        function(resolve, reject) {

            let body = "";

            req.on(
                "data",
                function(chunk) {

                    body += chunk;

                    if (
                        body.length >
                        1024 * 1024
                    ) {

                        reject(
                            new Error(
                                "Request too large"
                            )
                        );

                        req.destroy();

                    }

                }
            );


            req.on(
                "end",
                function() {

                    try {

                        if (!body) {

                            resolve({});

                            return;

                        }


                        resolve(
                            JSON.parse(
                                body
                            )
                        );

                    } catch (error) {

                        reject(
                            new Error(
                                "Invalid JSON"
                            )
                        );

                    }

                }
            );


            req.on(
                "error",
                reject
            );

        }
    );

}


// ===============================
// امنیت Headers
// ===============================

function securityHeaders() {

    return {

        "X-Content-Type-Options":
            "nosniff",

        "X-Frame-Options":
            "SAMEORIGIN",

        "Referrer-Policy":
            "no-referrer",

        "Cache-Control":
            "no-store"

    };

}


// ===============================
// ارسال فایل
// ===============================

function serveFile(
    res,
    file
) {

    const ext =
        path.extname(file)
            .toLowerCase();


    const types = {

        ".html":
            "text/html; charset=utf-8",

        ".css":
            "text/css; charset=utf-8",

        ".js":
            "application/javascript; charset=utf-8",

        ".json":
            "application/json; charset=utf-8",

        ".png":
            "image/png",

        ".jpg":
            "image/jpeg",

        ".jpeg":
            "image/jpeg",

        ".webp":
            "image/webp",

        ".ico":
            "image/x-icon"

    };


    const contentType =
        types[ext] ||
        "application/octet-stream";


    fs.readFile(
        file,
        function(error, data) {

            if (error) {

                res.writeHead(
                    404,
                    securityHeaders()
                );

                res.end(
                    "404 - File Not Found"
                );

                return;

            }


            const headers =
                securityHeaders();


            headers[
                "Content-Type"
            ] =
                contentType;


            res.writeHead(
                200,
                headers
            );


            res.end(
                data
            );

        }
    );

}


// ===============================
// مسیر امن فایل
// ===============================

function safePath(urlPath) {

    const clean =
        decodeURIComponent(
            urlPath
        )
        .replace(
            /^\/+/,
            ""
        );


    const full =
        path.normalize(
            path.join(
                ROOT,
                clean
            )
        );


    if (
        !full.startsWith(
            ROOT
        )
    ) {

        return null;

    }


    return full;

}


// ===============================
// LOGIN
// ===============================

async function login(
    req,
    res
) {

    try {

        const body =
            await getBody(req);


        const username =
            String(
                body.username || ""
            );


        const password =
            String(
                body.password || ""
            );


        if (
            username !==
            ADMIN_USERNAME ||
            password !==
            ADMIN_PASSWORD
        ) {

            sendJSON(
                res,
                401,
                {
                    success: false,
                    message:
                        "نام کاربری یا رمز عبور اشتباه است."
                }
            );

            return;

        }


        const sessionId =
            createSession();


        sessions.set(
            sessionId,
            {
                created:
                    Date.now()
            }
        );


        res.writeHead(
            200,
            {
                ...securityHeaders(),

                "Content-Type":
                    "application/json; charset=utf-8",

                "Set-Cookie":
                    "admin_session=" +
                    sessionId +
                    "; HttpOnly; SameSite=Strict; Path=/; Max-Age=14400"
            }
        );


        res.end(
            JSON.stringify(
                {
                    success: true,
                    message:
                        "ورود موفق بود."
                }
            )
        );


    } catch (error) {

        sendJSON(
            res,
            400,
            {
                success: false,
                message:
                    "اطلاعات ورود نامعتبر است."
            }
        );

    }

}


// ===============================
// LOGOUT
// ===============================

function logout(
    req,
    res
) {

    const cookies =
        getCookies(req);


    if (
        cookies.admin_session
    ) {

        sessions.delete(
            cookies.admin_session
        );

    }


    res.writeHead(
        200,
        {
            ...securityHeaders(),

            "Content-Type":
                "application/json; charset=utf-8",

            "Set-Cookie":
                "admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
        }
    );


    res.end(
        JSON.stringify(
            {
                success: true
            }
        )
    );

}


// ===============================
// CHECK AUTH
// ===============================

function checkAuth(
    req,
    res
) {

    sendJSON(
        res,
        200,
        {
            authenticated:
                isAuthenticated(req)
        }
    );

}


// ===============================
// PRODUCTS
// ===============================

function getProducts(
    req,
    res
) {

    const products =
        readJSON(
            PRODUCTS_FILE,
            []
        );


    sendJSON(
        res,
        200,
        products
    );

}


// ===============================
// ADMIN PRODUCTS
// ===============================

function updateProducts(
    req,
    res
) {

    if (
        !isAuthenticated(req)
    ) {

        sendJSON(
            res,
            401,
            {
                success: false,
                message:
                    "دسترسی غیرمجاز"
            }
        );

        return;

    }


    getBody(req)
        .then(
            function(body) {

                if (
                    !Array.isArray(
                        body.products
                    )
                ) {

                    sendJSON(
                        res,
                        400,
                        {
                            success: false,
                            message:
                                "اطلاعات محصول نامعتبر است."
                        }
                    );

                    return;

                }


                writeJSON(
                    PRODUCTS_FILE,
                    body.products
                );


                sendJSON(
                    res,
                    200,
                    {
                        success: true,
                        products:
                            body.products
                    }
                );

            }
        )
        .catch(
            function() {

                sendJSON(
                    res,
                    400,
                    {
                        success: false,
                        message:
                            "اطلاعات نامعتبر است."
                    }
                );

            }
        );

}


// ===============================
// ORDERS
// ===============================

function getOrders(
    req,
    res
) {

    if (
        !isAuthenticated(req)
    ) {

        sendJSON(
            res,
            401,
            {
                success: false,
                message:
                    "ابتدا وارد پنل مدیریت شوید."
            }
        );

        return;

    }


    const orders =
        readJSON(
            ORDERS_FILE,
            []
        );


    sendJSON(
        res,
        200,
        orders
    );

}


// ===============================
// CREATE ORDER
// ===============================

function createOrder(
    req,
    res
) {

    getBody(req)
        .then(
            function(body) {

                const name =
                    String(
                        body.customerName || ""
                    ).trim();


                const phone =
                    String(
                        body.customerPhone || ""
                    ).trim();


                const quantity =
                    Number(
                        body.quantity
                    );


                const product =
                    String(
                        body.product || ""
                    ).trim();


                const unitPrice =
                    Number(
                        body.unitPrice
                    );


                if (
                    !name ||
                    !phone ||
                    !product ||
                    !Number.isInteger(
                        quantity
                    ) ||
                    quantity < 1 ||
                    quantity > 1000 ||
                    !Number.isFinite(
                        unitPrice
                    ) ||
                    unitPrice < 0
                ) {

                    sendJSON(
                        res,
                        400,
                        {
                            success: false,
                            message:
                                "اطلاعات سفارش کامل یا صحیح نیست."
                        }
                    );

                    return;

                }


                const products =
                    readJSON(
                        PRODUCTS_FILE,
                        []
                    );


                const selectedProduct =
                    products.find(
                        function(item) {

                            return (
                                item.name ===
                                product
                            );

                        }
                    );


                if (
                    !selectedProduct ||
                    selectedProduct.available ===
                    false
                ) {

                    sendJSON(
                        res,
                        400,
                        {
                            success: false,
                            message:
                                "این محصول در حال حاضر موجود نیست."
                        }
                    );

                    return;

                }


                const total =
                    quantity *
                    unitPrice;


                const now =
                    new Date();


                const order = {

                    id:
                        Date.now(),

                    orderNumber:
                        "NK-" +
                        Date.now()
                            .toString()
                            .slice(-6),

                    date:
                        now.toLocaleString(
                            "fa-IR"
                        ),

                    customerName:
                        name,

                    customerPhone:
                        phone,

                    product:
                        product,

                    quantity:
                        quantity,

                    unitPrice:
                        unitPrice,

                    total:
                        total,

                    status:
                        "جدید",

                    description:
                        String(
                            body.description || ""
                        ).slice(
                            0,
                            300
                        ),

                    type:
                        "حضوری"

                };


                const orders =
                    readJSON(
                        ORDERS_FILE,
                        []
                    );


                orders.unshift(
                    order
                );


                writeJSON(
                    ORDERS_FILE,
                    orders
                );


                sendJSON(
                    res,
                    201,
                    {
                        success: true,
                        order:
                            order
                    }
                );

            }
        )
        .catch(
            function() {

                sendJSON(
                    res,
                    400,
                    {
                        success: false,
                        message:
                            "اطلاعات سفارش نامعتبر است."
                    }
                );

            }
        );

}


// ===============================
// UPDATE ORDER
// ===============================

function updateOrder(
    req,
    res
) {

    if (
        !isAuthenticated(req)
    ) {

        sendJSON(
            res,
            401,
            {
                success: false,
                message:
                    "دسترسی غیرمجاز"
            }
        );

        return;

    }


    getBody(req)
        .then(
            function(body) {

                const id =
                    Number(
                        body.id
                    );


                const status =
                    String(
                        body.status || ""
                    );


                const allowed = [

                    "جدید",
                    "آماده شد",
                    "تحویل شد",
                    "لغو شد"

                ];


                if (
                    !Number.isFinite(id) ||
                    !allowed.includes(
                        status
                    )
                ) {

                    sendJSON(
                        res,
                        400,
                        {
                            success: false,
                            message:
                                "اطلاعات نامعتبر است."
                        }
                    );

                    return;

                }


                const orders =
                    readJSON(
                        ORDERS_FILE,
                        []
                    );


                const order =
                    orders.find(
                        function(item) {

                            return (
                                Number(item.id) ===
                                id
                            );

                        }
                    );


                if (!order) {

                    sendJSON(
                        res,
                        404,
                        {
                            success: false,
                            message:
                                "سفارش پیدا نشد."
                        }
                    );

                    return;

                }


                order.status =
                    status;


                writeJSON(
                    ORDERS_FILE,
                    orders
                );


                sendJSON(
                    res,
                    200,
                    {
                        success: true,
                        order:
                            order
                    }
                );

            }
        )
        .catch(
            function() {

                sendJSON(
                    res,
                    400,
                    {
                        success: false,
                        message:
                            "اطلاعات نامعتبر است."
                    }
                );

            }
        );

}


// ===============================
// SALES
// ===============================

function getSales(
    req,
    res
) {

    if (
        !isAuthenticated(req)
    ) {

        sendJSON(
            res,
            401,
            {
                success: false,
                message:
                    "دسترسی غیرمجاز"
            }
        );

        return;

    }


    const sales =
        readJSON(
            SALES_FILE,
            []
        );


    sendJSON(
        res,
        200,
        sales
    );

}


// ===============================
// CREATE SALE
// ===============================

function createSale(
    req,
    res
) {

    if (
        !isAuthenticated(req)
    ) {

        sendJSON(
            res,
            401,
            {
                success: false,
                message:
                    "دسترسی غیرمجاز"
            }
        );

        return;

    }


    getBody(req)
        .then(
            function(body) {

                const quantity =
                    Number(
                        body.quantity
                    );


                const unitPrice =
                    Number(
                        body.unitPrice
                    );


                if (
                    !Number.isInteger(
                        quantity
                    ) ||
                    quantity < 1 ||
                    quantity > 1000 ||
                    !Number.isFinite(
                        unitPrice
                    ) ||
                    unitPrice < 0
                ) {

                    sendJSON(
                        res,
                        400,
                        {
                            success: false,
                            message:
                                "تعداد یا قیمت نامعتبر است."
                        }
                    );

                    return;

                }


                const sale = {

                    id:
                        Date.now(),

                    date:
                        new Date()
                            .toLocaleString(
                                "fa-IR"
                            ),

                    customerName:
                        String(
                            body.customerName ||
                            "مشتری حضوری"
                        ).slice(
                            0,
                            60
                        ),

                    customerPhone:
                        String(
                            body.customerPhone ||
                            "-"
                        ).slice(
                            0,
                            20
                        ),

                    product:
                        String(
                            body.product ||
                            "نان خانگی کنجدی"
                        ).slice(
                            0,
                            100
                        ),

                    quantity:
                        quantity,

                    unitPrice:
                        unitPrice,

                    total:
                        quantity *
                        unitPrice,

                    payment:
                        String(
                            body.payment ||
                            "نقدی"
                        ).slice(
                            0,
                            30
                        ),

                    description:
                        String(
                            body.description ||
                            ""
                        ).slice(
                            0,
                            300
                        ),

                    type:
                        "حضوری"

                };


                const sales =
                    readJSON(
                        SALES_FILE,
                        []
                    );


                sales.unshift(
                    sale
                );


                writeJSON(
                    SALES_FILE,
                    sales
                );


                sendJSON(
                    res,
                    201,
                    {
                        success: true,
                        sale:
                            sale
                    }
                );

            }
        )
        .catch(
            function() {

                sendJSON(
                    res,
                    400,
                    {
                        success: false,
                        message:
                            "اطلاعات فروش نامعتبر است."
                    }
                );

            }
        );

}


// ===============================
// DELETE SALE
// ===============================

function deleteSale(
    req,
    res
) {

    if (
        !isAuthenticated(req)
    ) {

        sendJSON(
            res,
            401,
            {
                success: false,
                message:
                    "دسترسی غیرمجاز"
            }
        );

        return;

    }


    getBody(req)
        .then(
            function(body) {

                const id =
                    Number(
                        body.id
                    );


                const sales =
                    readJSON(
                        SALES_FILE,
                        []
                    );


                const filtered =
                    sales.filter(
                        function(sale) {

                            return (
                                Number(
                                    sale.id
                                ) !==
                                id
                            );

                        }
                    );


                writeJSON(
                    SALES_FILE,
                    filtered
                );


                sendJSON(
                    res,
                    200,
                    {
                        success: true
                    }
                );

            }
        )
        .catch(
            function() {

                sendJSON(
                    res,
                    400,
                    {
                        success: false,
                        message:
                            "اطلاعات نامعتبر است."
                    }
                );

            }
        );

}


// ===============================
// DASHBOARD
// ===============================

function dashboard(
    req,
    res
) {

    if (
        !isAuthenticated(req)
    ) {

        sendJSON(
            res,
            401,
            {
                success: false,
                message:
                    "دسترسی غیرمجاز"
            }
        );

        return;

    }


    const orders =
        readJSON(
            ORDERS_FILE,
            []
        );


    const sales =
        readJSON(
            SALES_FILE,
            []
        );


    const ordersMoney =
        orders.reduce(
            function(total, item) {

                return total +
                    Number(
                        item.total || 0
                    );

            },
            0
        );


    const salesMoney =
        sales.reduce(
            function(total, item) {

                return total +
                    Number(
                        item.total || 0
                    );

            },
            0
        );


    const newOrders =
        orders.filter(
            function(item) {

                return (
                    !item.status ||
                    item.status ===
                    "جدید"
                );

            }
        ).length;


    sendJSON(
        res,
        200,
        {

            totalOrders:
                orders.length,

            newOrders:
                newOrders,

            ordersMoney:
                ordersMoney,

            salesMoney:
                salesMoney,

            totalSales:
                sales.length

        }
    );

}


// ===============================
// SERVER
// ===============================

const server =
    http.createServer(
        async function(req, res) {

            try {

                const url =
                    new URL(
                        req.url,
                        `http://${req.headers.host}`
                    );


                const pathname =
                    url.pathname;


                // -----------------------
                // API
                // -----------------------

                if (
                    pathname ===
                    "/api/login" &&
                    req.method ===
                    "POST"
                ) {

                    await login(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/logout" &&
                    req.method ===
                    "POST"
                ) {

                    logout(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/auth" &&
                    req.method ===
                    "GET"
                ) {

                    checkAuth(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/products" &&
                    req.method ===
                    "GET"
                ) {

                    getProducts(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/products" &&
                    req.method ===
                    "POST"
                ) {

                    updateProducts(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/orders" &&
                    req.method ===
                    "GET"
                ) {

                    getOrders(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/orders" &&
                    req.method ===
                    "POST"
                ) {

                    createOrder(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/orders/status" &&
                    req.method ===
                    "POST"
                ) {

                    updateOrder(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/sales" &&
                    req.method ===
                    "GET"
                ) {

                    getSales(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/sales" &&
                    req.method ===
                    "POST"
                ) {

                    createSale(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/sales/delete" &&
                    req.method ===
                    "POST"
                ) {

                    deleteSale(
                        req,
                        res
                    );

                    return;

                }


                if (
                    pathname ===
                    "/api/dashboard" &&
                    req.method ===
                    "GET"
                ) {

                    dashboard(
                        req,
                        res
                    );

                    return;

                }


                // -----------------------
                // فایل‌ها
                // -----------------------

                let filePath;


                if (
                    pathname === "/"
                ) {

                    filePath =
                        path.join(
                            ROOT,
                            "index.html"
                        );

                } else {

                    filePath =
                        safePath(
                            pathname
                        );

                }


                if (!filePath) {

                    res.writeHead(
                        403,
                        securityHeaders()
                    );

                    res.end(
                        "403 Forbidden"
                    );

                    return;

                }


                serveFile(
                    res,
                    filePath
                );


            } catch (error) {

                console.error(
                    error
                );


                sendJSON(
                    res,
                    500,
                    {
                        success: false,
                        message:
                            "خطای داخلی سرور"
                    }
                );

            }

        }
    );


// ===============================
// SESSION CLEANUP
// ===============================

setInterval(
    function() {

        const now =
            Date.now();


        for (
            const [
                id,
                session
            ]
            of sessions
        ) {

            if (
                now -
                session.created >
                SESSION_TIME
            ) {

                sessions.delete(
                    id
                );

            }

        }

    },
    1000 * 60 * 15
);


// ===============================
// START
// ===============================

server.listen(
    PORT,
    HOST,
    function() {

        console.log("");

        console.log(
            "🍞 نانک - سرور اجرا شد"
        );

        console.log(
            `http://${HOST}:${PORT}`
        );

        console.log("");

        console.log(
            "پنل مدیریت:"
        );

        console.log(
            `http://${HOST}:${PORT}/admin.html`
        );

        console.log("");

    }
);