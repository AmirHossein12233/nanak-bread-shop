const defaultProduct = {
    id: "sesame-bread",
    name: "نان خانگی کنجدی",
    price: 15000,
    icon: "🍞",
    available: false
};


/* =========================
   GET PRODUCT
========================= */

function getProduct() {

    const saved =
        localStorage.getItem("sesameBread");


    if (!saved) {

        localStorage.setItem(
            "sesameBread",
            JSON.stringify(defaultProduct)
        );

        return defaultProduct;
    }


    try {

        const product =
            JSON.parse(saved);


        return {
            ...defaultProduct,
            ...product
        };

    } catch (error) {

        localStorage.setItem(
            "sesameBread",
            JSON.stringify(defaultProduct)
        );

        return defaultProduct;
    }
}


/* =========================
   FORMAT PRICE
========================= */

function formatPrice(price) {

    return Number(price)
        .toLocaleString("fa-IR");

}


/* =========================
   RENDER STORE
========================= */

function renderStore() {

    const product =
        getProduct();


    const container =
        document.getElementById(
            "productContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const card =
        document.createElement("div");


    card.className =
        "product-card";


    card.innerHTML = `

        <div class="bread-icon">
            ${product.icon}
        </div>


        <span class="tag">
            نان تازه و خانگی
        </span>


        <h2>
            ${product.name}
        </h2>


        <p class="description">
            نان خانگی تازه و خوش‌طعم
            با کنجد، مناسب مصرف روزانه.
        </p>


        <div class="price-box">

            <span class="price-label">
                قیمت هر عدد
            </span>

            <span class="price">
                ${formatPrice(product.price)}
            </span>

            <span class="currency">
                تومان
            </span>

        </div>


        ${
            product.available

            ?

            `

                <div class="available">
                    ✓ موجود است
                </div>


                <div class="quantity-box">

                    <label for="quantity">
                        تعداد نان
                    </label>


                    <div class="quantity-controls">

                        <button
                            type="button"
                            onclick="changeQuantity(-1)"
                            aria-label="کم کردن تعداد"
                        >
                            −
                        </button>


                        <input
                            id="quantity"
                            type="number"
                            value="1"
                            min="1"
                            max="99"
                            inputmode="numeric"
                            onchange="updateTotal()"
                            oninput="updateTotal()"
                        >


                        <button
                            type="button"
                            onclick="changeQuantity(1)"
                            aria-label="زیاد کردن تعداد"
                        >
                            +
                        </button>

                    </div>


                    <div class="total-box">

                        <span>
                            مبلغ کل:
                        </span>


                        <strong id="totalPrice">
                            ${formatPrice(product.price)}
                            تومان
                        </strong>

                    </div>

                </div>

            `

            :

            `

                <div class="unavailable">
                    ✕ فعلاً ناموجود است
                </div>

            `
        }


        <div class="shop-only">

            🏪 خرید فقط حضوری


            <small>
                برای خرید نان،
                حضوری به فروشگاه مراجعه کنید.
            </small>


            <a
                href="tel:09933896831"
                class="call-button"
            >
                📞 تماس با ما
            </a>

        </div>

    `;


    container.appendChild(card);
}


/* =========================
   GET QUANTITY
========================= */

function getQuantity() {

    const input =
        document.getElementById(
            "quantity"
        );


    if (!input) {
        return 1;
    }


    let quantity =
        parseInt(input.value);


    if (
        isNaN(quantity) ||
        quantity < 1
    ) {

        quantity = 1;
    }


    if (quantity > 99) {

        quantity = 99;
    }


    input.value =
        quantity;


    return quantity;
}


/* =========================
   UPDATE TOTAL
========================= */

function updateTotal() {

    const product =
        getProduct();


    const quantity =
        getQuantity();


    const total =
        product.price * quantity;


    const totalElement =
        document.getElementById(
            "totalPrice"
        );


    if (!totalElement) {
        return;
    }


    totalElement.textContent =
        formatPrice(total)
        + " تومان";
}


/* =========================
   CHANGE QUANTITY
========================= */

function changeQuantity(amount) {

    const input =
        document.getElementById(
            "quantity"
        );


    if (!input) {
        return;
    }


    let quantity =
        parseInt(input.value);


    if (
        isNaN(quantity) ||
        quantity < 1
    ) {

        quantity = 1;
    }


    quantity += amount;


    if (quantity < 1) {

        quantity = 1;
    }


    if (quantity > 99) {

        quantity = 99;
    }


    input.value =
        quantity;


    updateTotal();
}


/* =========================
   AUTO UPDATE
========================= */

window.addEventListener(
    "storage",
    function(event) {

        if (
            event.key === "sesameBread"
        ) {

            renderStore();
        }

    }
);


/* =========================
   START
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        renderStore();

    }
);