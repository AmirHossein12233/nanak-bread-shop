```javascript
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;

const ORDERS_FILE = path.join(ROOT, "orders.json");
const SALES_FILE = path.join(ROOT, "sales.json");
const PRODUCTS_FILE = path.join(ROOT, "products.json");

function createFile(file, data) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2),
            "utf8"
        );
    }
}

createFile(ORDERS_FILE, []);

createFile(SALES_FILE, []);

createFile(PRODUCTS_FILE, [
    {
        id: "sesameBread",
        name: "نان خانگی کنجدی",
        price: 15000,
        available: true
    }
]);

function readJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            return fallback;
        }

        const text = fs.readFileSync(file, "utf8");

        if (!text.trim()) {
            return fallback;
        }

        return JSON.parse(text);

    } catch (error) {
        console.log("خطا در خواندن فایل:", file);
        return fallback;
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".xml": "application/xml; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon"
    };

    return types[ext] || "application/octet-stream";
}

function sendJSON(response, statusCode, data) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });

    response.end(
        JSON.stringify(data)
    );
}

function getRequestBody(request) {
    return new Promise(function(resolve, reject) {

        let body = "";

        request.on("data", function(chunk) {

            body += chunk.toString();

            if (body.length > 1024 * 1024) {
                reject(
                    new Error("Request too large")
                );

                request.destroy();
            }
        });

        request.on("end", function() {

            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(
                    JSON.parse(body)
                );
            } catch (error) {
                reject(
                    new Error("JSON نامعتبر است")
                );
            }
        });

        request.on("error", reject);
    });
}

function send404(response) {
    response.writeHead(404, {
        "Content-Type":
            "text/plain; charset=utf-8"
    });

    response.end(
        "صفحه پیدا نشد"
    );
}

const server = http.createServer(
    async function(request, response) {

        try {

            const parsed =
                url.parse(
                    request.url,
                    true
                );

            const pathname =
                parsed.pathname;

            const method =
                request.method;


            /*
             * OPTIONS
             */

            if (method === "OPTIONS") {

                response.writeHead(204, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods":
                        "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers":
                        "Content-Type"
                });

                response.end();

                return;
            }


            /*
             * HEALTH
             */

            if (
                pathname === "/api/health" &&
                method === "GET"
            ) {

                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        message:
                            "Nanak server is running"
                    }
                );

                return;
            }


            /*
             * PRODUCTS GET
             */

            if (
                pathname === "/api/products" &&
                method === "GET"
            ) {

                const products =
                    readJSON(
                        PRODUCTS_FILE,
                        []
                    );

                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        products:
                            products
                    }
                );

                return;
            }


            /*
             * PRODUCTS PUT
             */

            if (
                pathname === "/api/products" &&
                method === "PUT"
            ) {

                const body =
                    await getRequestBody(
                        request
                    );

                const products =
                    readJSON(
                        PRODUCTS_FILE,
                        []
                    );

                const id =
                    String(
                        body.id || ""
                    );

                const index =
                    products.findIndex(
                        function(product) {
                            return String(
                                product.id
                            ) === id;
                        }
                    );

                if (index === -1) {

                    sendJSON(
                        response,
                        404,
                        {
                            success: false,
                            message:
                                "محصول پیدا نشد."
                        }
                    );

                    return;
                }


                if (
                    body.price !== undefined
                ) {

                    const price =
                        Number(
                            body.price
                        );

                    if (
                        !Number.isFinite(price) ||
                        price < 0
                    ) {

                        sendJSON(
                            response,
                            400,
                            {
                                success: false,
                                message:
                                    "قیمت نامعتبر است."
                            }
                        );

                        return;
                    }

                    products[index].price =
                        price;
                }


                if (
                    body.available !== undefined
                ) {

                    products[index].available =
                        Boolean(
                            body.available
                        );
                }


                if (
                    body.name !== undefined
                ) {

                    products[index].name =
                        String(
                            body.name
                        ).trim();
                }


                writeJSON(
                    PRODUCTS_FILE,
                    products
                );


                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        product:
                            products[index]
                    }
                );

                return;
            }


            /*
             * ORDERS GET
             */

            if (
                pathname === "/api/orders" &&
                method === "GET"
            ) {

                const orders =
                    readJSON(
                        ORDERS_FILE,
                        []
                    );

                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        orders:
                            orders
                    }
                );

                return;
            }


            /*
             * CREATE ORDER
             */

            if (
                pathname === "/api/orders" &&
                method === "POST"
            ) {

                const body =
                    await getRequestBody(
                        request
                    );


                const customerName =
                    String(
                        body.customerName || ""
                    ).trim();


                const customerPhone =
                    String(
                        body.customerPhone || ""
                    ).trim();


                const productName =
                    String(
                        body.product ||
                        "نان خانگی کنجدی"
                    ).trim();


                const quantity =
                    Number(
                        body.quantity
                    );


                const unitPrice =
                    Number(
                        body.unitPrice
                    );


                if (!customerName) {

                    sendJSON(
                        response,
                        400,
                        {
                            success: false,
                            message:
                                "نام مشتری وارد نشده است."
                        }
                    );

                    return;
                }


                if (!customerPhone) {

                    sendJSON(
                        response,
                        400,
                        {
                            success: false,
                            message:
                                "شماره تماس وارد نشده است."
                        }
                    );

                    return;
                }


                if (
                    !Number.isFinite(quantity) ||
                    quantity < 1 ||
                    quantity > 100
                ) {

                    sendJSON(
                        response,
                        400,
                        {
                            success: false,
                            message:
                                "تعداد سفارش نامعتبر است."
                        }
                    );

                    return;
                }


                if (
                    !Number.isFinite(unitPrice) ||
                    unitPrice < 0
                ) {

                    sendJSON(
                        response,
                        400,
                        {
                            success: false,
                            message:
                                "قیمت نامعتبر است."
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

                    timestamp:
                        now.toISOString(),

                    customerName:
                        customerName,

                    customerPhone:
                        customerPhone,

                    product:
                        productName,

                    quantity:
                        quantity,

                    unitPrice:
                        unitPrice,

                    total:
                        total,

                    status:
                        "جدید",

                    description:
                        "سفارش برای خرید حضوری",

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


                console.log(
                    "سفارش جدید:",
                    order.orderNumber
                );


                sendJSON(
                    response,
                    201,
                    {
                        success: true,
                        message:
                            "سفارش با موفقیت ثبت شد.",
                        order:
                            order
                    }
                );

                return;
            }


            /*
             * ORDER PUT
             */

            if (
                pathname.startsWith(
                    "/api/orders/"
                ) &&
                method === "PUT"
            ) {

                const orderNumber =
                    decodeURIComponent(
                        pathname
                            .split("/")
                            .pop()
                    );


                const body =
                    await getRequestBody(
                        request
                    );


                const orders =
                    readJSON(
                        ORDERS_FILE,
                        []
                    );


                const index =
                    orders.findIndex(
                        function(order) {

                            return String(
                                order.orderNumber
                            ) === orderNumber;

                        }
                    );


                if (index === -1) {

                    sendJSON(
                        response,
                        404,
                        {
                            success: false,
                            message:
                                "سفارش پیدا نشد."
                        }
                    );

                    return;
                }


                if (
                    body.status !== undefined
                ) {

                    orders[index].status =
                        String(
                            body.status
                        );
                }


                if (
                    body.description !== undefined
                ) {

                    orders[index].description =
                        String(
                            body.description
                        );
                }


                writeJSON(
                    ORDERS_FILE,
                    orders
                );


                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        order:
                            orders[index]
                    }
                );

                return;
            }


            /*
             * DELETE ONE ORDER
             */

            if (
                pathname.startsWith(
                    "/api/orders/"
                ) &&
                method === "DELETE"
            ) {

                const orderNumber =
                    decodeURIComponent(
                        pathname
                            .split("/")
                            .pop()
                    );


                const orders =
                    readJSON(
                        ORDERS_FILE,
                        []
                    );


                const oldLength =
                    orders.length;


                const newOrders =
                    orders.filter(
                        function(order) {

                            return String(
                                order.orderNumber
                            ) !== orderNumber;

                        }
                    );


                if (
                    newOrders.length ===
                    oldLength
                ) {

                    sendJSON(
                        response,
                        404,
                        {
                            success: false,
                            message:
                                "سفارش پیدا نشد."
                        }
                    );

                    return;
                }


                writeJSON(
                    ORDERS_FILE,
                    newOrders
                );


                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        message:
                            "سفارش حذف شد."
                    }
                );

                return;
            }


            /*
             * DELETE ALL ORDERS
             */

            if (
                pathname === "/api/orders" &&
                method === "DELETE"
            ) {

                writeJSON(
                    ORDERS_FILE,
                    []
                );


                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        message:
                            "تمام سفارش‌ها حذف شدند."
                    }
                );

                return;
            }


            /*
             * SALES GET
             */

            if (
                pathname === "/api/sales" &&
                method === "GET"
            ) {

                const sales =
                    readJSON(
                        SALES_FILE,
                        []
                    );


                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        sales:
                            sales
                    }
                );

                return;
            }


            /*
             * SALES POST
             */

            if (
                pathname === "/api/sales" &&
                method === "POST"
            ) {

                const body =
                    await getRequestBody(
                        request
                    );


                const weight =
                    Number(
                        body.weight
                    ) || 0;


                const pricePerUnit =
                    Number(
                        body.pricePerUnit
                    ) || 0;


                const total =
                    Number(
                        body.total
                    ) ||
                    (
                        weight *
                        pricePerUnit
                    );


                const now =
                    new Date();


                const sale = {

                    id:
                        Date.now(),

                    date:
                        now.toLocaleString(
                            "fa-IR"
                        ),

                    timestamp:
                        now.toISOString(),

                    customerName:
                        String(
                            body.customerName ||
                            ""
                        ).trim(),

                    customerPhone:
                        String(
                            body.customerPhone ||
                            ""
                        ).trim(),

                    product:
                        String(
                            body.product ||
                            "نان خانگی کنجدی"
                        ).trim(),

                    weight:
                        weight,

                    pricePerUnit:
                        pricePerUnit,

                    total:
                        total,

                    paymentMethod:
                        String(
                            body.paymentMethod ||
                            "نقدی"
                        ),

                    description:
                        String(
                            body.description ||
                            ""
                        ).trim()
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


                console.log(
                    "فروش جدید:",
                    moneyText(
                        sale.total
                    )
                );


                sendJSON(
                    response,
                    201,
                    {
                        success: true,
                        sale:
                            sale
                    }
                );

                return;
            }


            /*
             * DELETE ALL SALES
             */

            if (
                pathname === "/api/sales" &&
                method === "DELETE"
            ) {

                writeJSON(
                    SALES_FILE,
                    []
                );


                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        message:
                            "تمام فروش‌ها حذف شدند."
                    }
                );

                return;
            }


            /*
             * STATIC FILES
             */

            let filePath;


            if (
                pathname === "/" ||
                pathname === ""
            ) {

                filePath =
                    path.join(
                        ROOT,
                        "index.html"
                    );

            } else {

                const cleanPath =
                    pathname.replace(
                        /^\/+/,
                        ""
                    );


                filePath =
                    path.join(
                        ROOT,
                        cleanPath
                    );
            }


            const relativePath =
                path.relative(
                    ROOT,
                    filePath
                );


            if (
                relativePath.startsWith("..") ||
                path.isAbsolute(
                    relativePath
                )
            ) {

                response.writeHead(
                    403,
                    {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                );

                response.end(
                    "Forbidden"
                );

                return;
            }


            if (
                fs.existsSync(
                    filePath
                ) &&
                fs.statSync(
                    filePath
                ).isFile()
            ) {

                const content =
                    fs.readFileSync(
                        filePath
                    );


                response.writeHead(
                    200,
                    {
                        "Content-Type":
                            getContentType(
                                filePath
                            )
                    }
                );


                response.end(
                    content
                );

                return;
            }


            send404(
                response
            );


        } catch (error) {

            console.error(
                "Server error:",
                error
            );


            sendJSON(
                response,
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


function moneyText(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "fa-IR"
    ) + " تومان";

}


server.listen(
    PORT,
    HOST,
    function() {

        console.log(
            "================================"
        );

        console.log(
            "🍞 نانک - سرور اجرا شد"
        );

        console.log(
            "Port: " + PORT
        );

        console.log(
            "Panel: /admin.html"
        );

        console.log(
            "Health: /api/health"
        );

        console.log(
            "================================"
        );

    }
);
```
