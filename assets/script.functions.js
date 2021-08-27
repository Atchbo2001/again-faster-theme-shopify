function getVariantID(variantName) {
  const selectedVariantID = document.querySelector(
    `[name="${variantName}"]:checked`
  );
  if (selectedVariantID) return +selectedVariantID.value;
  return null;
}

function selectDefaultVariant(button) {
  let { variantName, variantID } = button.dataset;
  if (variantID || !variantName) return;
  const availableVariant = document.querySelector(
    `[name="${variantName}"]:not([disabled])`
  );
  if (!availableVariant) return;
  availableVariant.click();
}

async function onAddToCartButtonClicked(button) {
  let { variantName, qty, variantId } = button.dataset;
  qty = +qty;
  if (!variantId && variantName) variantId = getVariantID(variantName);
  if (variantId && isNaN(variantId)) {
    variantId = +variantId;
  }
  try {
    button.dataset.isProcessing = true;
    delete button.dataset.hasFailed;
    delete button.dataset.hasSucceed;
    await AgainFasterAPI.addToCart(variantId, qty);
    button.dataset.hasSucceed = true;
  } catch (ex) {
    button.dataset.hasFailed = true;
    console.error(ex);
  } finally {
    delete button.dataset.isProcessing;
  }
}

function onProductVariantChange(inputRadio) {
  const { optionsSelector } = inputRadio.dataset;
  const selectInput = document.querySelector(optionsSelector);
  selectInput.value = inputRadio.value;
}

function updateFormState(form) {
  const hasErrors = form.querySelectorAll(".o-input--has-error").length > 0;
  if (hasErrors) {
    form.classList.add("o-form--has-errors");
  } else {
    form.classList.remove("o-form--has-errors");
  }
}

function updateInputState(form, input, value, tag, type, isRequired) {
  if (value) {
    input.classList.add("o-input--has-value");
  } else {
    input.classList.remove("o-input--has-value");
  }

  switch (type) {
    case "password": {
      const { passwordGroup } = input.dataset;
      const relatedPasswordInputs = document.querySelectorAll(
        `[data-password-group="${passwordGroup}"]`
      );
      let passwordsMatch = true;
      relatedPasswordInputs.forEach((pwdInput) => {
        if (pwdInput.value !== value) passwordsMatch = false;
      });
      if (!passwordsMatch) {
        relatedPasswordInputs.forEach((pwdInput) =>
          pwdInput.classList.add("o-input--has-error")
        );
      } else {
        relatedPasswordInputs.forEach((pwdInput) =>
          pwdInput.classList.remove("o-input--has-error")
        );
      }
      break;
    }
  }
  /* asd */

  updateFormState(form);
}

function onInputChange(form, input) {
  input.classList.add("o-input--touched");
  const value = input.value;
  const tag = input.tagName;
  const type = input.getAttribute("type");
  const isRequired = input.hasAttribute("required");
  updateInputState(form, input, value, tag, type, isRequired);
}

function watchFormState(form) {
  const inputs = form.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.addEventListener("change", ({ target }) =>
      onInputChange(form, target)
    );
    input.addEventListener("input", ({ target }) =>
      onInputChange(form, target)
    );
  });
}

function updateCart(newData) {
  window.dispatchEvent(
    new CustomEvent(AF_EVENT.CART_UPDATE, { detail: newData })
  );
}

function hideCart() {
  window.dispatchEvent(new CustomEvent(AF_EVENT.CART_HIDE));
}

function showCart() {
  window.dispatchEvent(new CustomEvent(AF_EVENT.CART_SHOW));
}

function toggleCart() {
  window.dispatchEvent(new CustomEvent(AF_EVENT.CART_TOGGLE));
}