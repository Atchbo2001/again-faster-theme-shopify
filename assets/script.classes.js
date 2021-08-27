class DragSlider {
  sliderElement;
  isDown = false;
  startX;
  scrollLeft;

  constructor(element) {
    this.sliderElement = element;
    this.applyListeners();
  }

  _activateDrag() {
    this.isDown = true;
    setTimeout(() => {
      this.sliderElement.classList.add("is-active");
    }, 200);
  }

  _deactivateDrag() {
    this.isDown = false;
    setTimeout(() => {
      this.sliderElement.classList.remove("is-active");
    }, 200);
  }

  applyListeners() {
    this.sliderElement.addEventListener("mousedown", (e) => {
      this._activateDrag();
      this.startX = e.pageX - this.sliderElement.offsetLeft;
      this.scrollLeft = this.sliderElement.scrollLeft;
    });

    this.sliderElement.addEventListener("mouseleave", () => {
      this._deactivateDrag();
    });

    this.sliderElement.addEventListener("mouseup", () => {
      this._deactivateDrag();
    });

    this.sliderElement.addEventListener("mousemove", (e) => {
      if (!this.isDown) return;
      e.preventDefault();
      const x = e.pageX - this.sliderElement.offsetLeft;
      const walk = (x - this.startX) * 3;
      this.sliderElement.scrollLeft = this.scrollLeft - walk;
    });
  }
}

class AgainFasterAPI {
  static async addToCart(variantId, qty) {
    const data = {
      items: [
        {
          id: variantId,
          quantity: qty,
        },
      ],
    };
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Something went wrong");
    const responseJSON = await response.json();

    return responseJSON;
  }

  static async getCartData() {
    const response = await fetch("/cart.js", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Something went wrong");
    const responseJSON = await response.json();

    return responseJSON;
  }

  static async changeCartProductQty(id, quantity) {
    const response = await fetch("/cart/change.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        quantity,
      }),
    });
    if (!response.ok) throw new Error("Something went wrong");
    const responseJSON = await response.json();

    return responseJSON;
  }

  static async getRecommendedProducts(productID) {
    const response = await fetch(
      `/recommendations/products.json?product_id=${productID}`
    );
    if (!response.ok) throw new Error("Something went wrong");
    const responseJSON = await response.json();
    return responseJSON.products;
  }
}

class Cart {
  _changeTimeout = {};

  constructor(template, context, targetSelector) {
    this._template = template;
    this._context = {
      ...context,
      productQtyAddEventName: AF_EVENT.CART_PRODUCT_QTY_ADD,
      productDeleteEventName: AF_EVENT.CART_PRODUCT_DELETE,
    };
    this._target = document.querySelector(targetSelector);
    this._templateScript = Handlebars.compile(this._template);
    this._target.classList.add("js-cart--initialized");
    this._initEventListeners();
    updateCart();
  }

  _compile() {
    this._html = this._templateScript(this._context);
    this._target.innerHTML = this._html;
  }

  _addProductQty({ detail: button }) {
    let { targetSelector, key, addValue } = button.dataset;
    addValue = +addValue;
    const target = document.querySelector(targetSelector);
    const currentValue = +target.value;
    const newValue = currentValue + +addValue;
    if (addValue < 0 && currentValue <= 1) return;
    target.value = newValue;
    this._onProductQtyChange(key, newValue, button, 500);
  }

  _onProductQtyChange(id, qty, target, doAfter = 0) {
    console.log({ id, qty });
    if (this._changeTimeout[id]) clearTimeout(this._changeTimeout[id]);

    this._changeTimeout[id] = setTimeout(async () => {
      try {
        const newData = await AgainFasterAPI.changeCartProductQty(id, qty);
        this._onProductQtyChangeSucceed(id, qty, target, newData);
      } catch (ex) {
        console.error(ex);
        this._onProductQtyChangeFail(id, qty, target);
      }
    }, doAfter);
  }

  _onProductQtyChangeSucceed(id, qty, target, newData) {
    updateCart(newData);
  }

  _onProductQtyChangeFail(id, qty, target) {
    if (qty === 0) return;
    const input = document.querySelector(target.dataset.targetSelector);
    let { verifiedValue } = input.dataset;
    verifiedValue = +verifiedValue;
    input.value = verifiedValue;
  }

  _deleteProduct({ detail: button }) {
    let { key } = button.dataset;
    this._onProductQtyChange(key, 0, button);
  }

  async _getData(newData) {
    try {
      window.dispatchEvent(
        new CustomEvent(AF_EVENT.CART_PROCESSING, {
          detail: { isProcessing: true },
        })
      );
      let data;
      if (newData) {
        data = newData;
      } else {
        data = await AgainFasterAPI.getCartData();
      }
      this._context.products = data.items.map((item) => {
        item.final_price = formatter.format(
          (item.final_price / 100) * item.quantity
        );
        return item;
      });
      this._context.subtotal = formatter.format(
        data.items_subtotal_price / 100
      );
      this._compile();
    } catch (ex) {
      console.error(ex);
    } finally {
      window.dispatchEvent(
        new CustomEvent(AF_EVENT.CART_PROCESSING, {
          detail: { isProcessing: false },
        })
      );
    }
  }

  _changeVisibility(isVisible) {
    this._isVisible = isVisible;
    window.dispatchEvent(
      new CustomEvent(AF_EVENT.CART_VISIBILITY_CHANGE, {
        detail: { isVisible: this._isVisible },
      })
    );
    if (this._isVisible) {
      updateCart();
    }
  }

  _initEventListeners() {
    window.addEventListener(AF_EVENT.CART_UPDATE, ({ detail: newData }) =>
      this._getData(newData)
    );
    window.addEventListener(AF_EVENT.CART_TOGGLE, () =>
      this._changeVisibility(!this._isVisible)
    );
    window.addEventListener(AF_EVENT.CART_HIDE, () =>
      this._changeVisibility(false)
    );
    window.addEventListener(AF_EVENT.CART_SHOW, () =>
      this._changeVisibility(true)
    );
    window.addEventListener(AF_EVENT.CART_PRODUCT_QTY_ADD, (event) =>
      this._addProductQty(event)
    );
    window.addEventListener(AF_EVENT.CART_PRODUCT_DELETE, (event) =>
      this._deleteProduct(event)
    );
  }
}