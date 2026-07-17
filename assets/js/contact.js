"use strict";

/**
 * BathNice contact form controller.
 *
 * Responsibilities:
 * - select a service from the URL query parameter;
 * - validate every required form field;
 * - provide accessible inline error messages;
 * - submit the form asynchronously to contact.php;
 * - handle loading, success, server-validation, and network errors;
 * - prevent duplicate submissions;
 * - preserve a native POST fallback when Fetch API is unavailable.
 */

(() => {
    const config = window.BATHNICE_CONFIG || {};

    const state = {
        initialized: false,
        submitting: false,
        touchedFields: new Set(),
        preselectedService: "",
        abortController: null
    };

    const selectors = {
        page: ".contact-page",
        form: "[data-contact-form]",
        field: "[data-form-field]",
        submit: "[data-form-submit]",
        submitLabel: "[data-form-submit-label]",
        status: "[data-form-status]",
        serviceSelect: "[data-service-select]",
        sourcePage: 'input[name="sourcePage"]'
    };

    const fallbackMessages = {
        required: "This field is required.",
        nameRequired: "Enter your full name.",
        nameShort: "Enter at least 2 characters.",
        nameLong: "The name must not exceed 100 characters.",
        emailRequired: "Enter your email address.",
        emailInvalid: "Enter a valid email address.",
        phoneRequired: "Enter your phone number.",
        phoneInvalid: "Enter a valid phone number with the area code.",
        serviceRequired: "Select a bathroom service.",
        messageRequired: "Describe your bathroom project.",
        messageShort: "Enter at least 20 characters.",
        messageLong: "The project description must not exceed 3,000 characters.",
        consentRequired:
            "Confirm that you agree to the privacy and provider-sharing statement.",
        validationSummary:
            "Please review the highlighted fields before submitting your request.",
        sending: "Sending Request…",
        success:
            "Your project request has been submitted. Thank you for contacting BathNice.",
        serverError:
            "The request could not be submitted. Please review the form and try again.",
        networkError:
            "We could not connect to the form service. Please check your connection and try again.",
        timeoutError:
            "The request took too long to send. Please try again.",
        unavailable:
            "The request form is temporarily unavailable. Please contact BathNice by phone or email."
    };

    function isContactPage() {
        return Boolean(document.querySelector(selectors.page));
    }

    function getForm() {
        return document.querySelector(selectors.form);
    }

    function getFormConfig() {
        return config.form || {};
    }

    function getConfiguredMessage(key, fallback) {
        const formConfig = getFormConfig();

        const candidates = [
            formConfig[key],
            formConfig.messages?.[key],
            formConfig.validation?.[key]
        ];

        const configuredValue = candidates.find(
            (value) =>
                typeof value === "string" &&
                value.trim().length > 0
        );

        return configuredValue || fallback;
    }

    function normalizeText(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ");
    }

    function normalizeComparableValue(value) {
        return normalizeText(value).toLocaleLowerCase("en-US");
    }

    function getErrorElement(form, fieldName) {
        return Array.from(
            form.querySelectorAll("[data-error-for]")
        ).find(
            (element) =>
                element.dataset.errorFor === fieldName
        ) || null;
    }

    function getFieldWrapper(control) {
        return control?.closest(".form__field") || null;
    }

    function getNamedControl(form, fieldName) {
        const control = form.elements.namedItem(fieldName);

        if (!control) {
            return null;
        }

        if (control instanceof RadioNodeList) {
            return control[0] || null;
        }

        return control;
    }

    function setFieldError(form, control, message) {
        if (!control) {
            return;
        }

        const fieldName = control.name;
        const wrapper = getFieldWrapper(control);
        const errorElement = getErrorElement(form, fieldName);

        control.setAttribute("aria-invalid", "true");
        control.classList.add("is-invalid");
        control.classList.remove("is-valid");

        wrapper?.classList.add("is-invalid");
        wrapper?.classList.remove("is-valid");

        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function clearFieldError(form, control, markValid = false) {
        if (!control) {
            return;
        }

        const fieldName = control.name;
        const wrapper = getFieldWrapper(control);
        const errorElement = getErrorElement(form, fieldName);

        control.removeAttribute("aria-invalid");
        control.classList.remove("is-invalid");

        wrapper?.classList.remove("is-invalid");

        if (markValid) {
            control.classList.add("is-valid");
            wrapper?.classList.add("is-valid");
        } else {
            control.classList.remove("is-valid");
            wrapper?.classList.remove("is-valid");
        }

        if (errorElement) {
            errorElement.textContent = "";
        }
    }

    function clearAllValidation(form) {
        form
            .querySelectorAll(selectors.field)
            .forEach((control) => {
                clearFieldError(form, control, false);
            });

        state.touchedFields.clear();
    }

    function countPhoneDigits(value) {
        return String(value || "").replace(/\D/g, "").length;
    }

    function validateFullName(control) {
        const value = normalizeText(control.value);

        if (!value) {
            return getConfiguredMessage(
                "nameRequired",
                fallbackMessages.nameRequired
            );
        }

        if (value.length < 2) {
            return getConfiguredMessage(
                "nameShort",
                fallbackMessages.nameShort
            );
        }

        if (value.length > 100) {
            return getConfiguredMessage(
                "nameLong",
                fallbackMessages.nameLong
            );
        }

        return "";
    }

    function validateEmail(control) {
        const value = normalizeText(control.value);

        if (!value) {
            return getConfiguredMessage(
                "emailRequired",
                fallbackMessages.emailRequired
            );
        }

        if (
            control.validity.typeMismatch ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value)
        ) {
            return getConfiguredMessage(
                "emailInvalid",
                fallbackMessages.emailInvalid
            );
        }

        return "";
    }

    function validatePhone(control) {
        const value = normalizeText(control.value);

        if (!value) {
            return getConfiguredMessage(
                "phoneRequired",
                fallbackMessages.phoneRequired
            );
        }

        const digitCount = countPhoneDigits(value);
        const containsOnlyExpectedCharacters =
            /^[+\d\s()./-]+$/u.test(value);

        if (
            digitCount < 7 ||
            digitCount > 20 ||
            !containsOnlyExpectedCharacters
        ) {
            return getConfiguredMessage(
                "phoneInvalid",
                fallbackMessages.phoneInvalid
            );
        }

        return "";
    }

    function validateService(control) {
        if (!normalizeText(control.value)) {
            return getConfiguredMessage(
                "serviceRequired",
                fallbackMessages.serviceRequired
            );
        }

        return "";
    }

    function validateMessage(control) {
        const value = normalizeText(control.value);

        if (!value) {
            return getConfiguredMessage(
                "messageRequired",
                fallbackMessages.messageRequired
            );
        }

        if (value.length < 20) {
            return getConfiguredMessage(
                "messageShort",
                fallbackMessages.messageShort
            );
        }

        if (value.length > 3000) {
            return getConfiguredMessage(
                "messageLong",
                fallbackMessages.messageLong
            );
        }

        return "";
    }

    function validateConsent(control) {
        if (!control.checked) {
            return getConfiguredMessage(
                "consentRequired",
                fallbackMessages.consentRequired
            );
        }

        return "";
    }

    function getValidationMessage(control) {
        if (!control || control.disabled) {
            return "";
        }

        switch (control.name) {
            case "fullName":
                return validateFullName(control);

            case "email":
                return validateEmail(control);

            case "phone":
                return validatePhone(control);

            case "service":
                return validateService(control);

            case "message":
                return validateMessage(control);

            case "privacyConsent":
                return validateConsent(control);

            default:
                if (control.required) {
                    const value =
                        control.type === "checkbox"
                            ? control.checked
                            : normalizeText(control.value);

                    if (!value) {
                        return getConfiguredMessage(
                            "required",
                            fallbackMessages.required
                        );
                    }
                }

                return "";
        }
    }

    function validateControl(
        form,
        control,
        {
            showError = true,
            markValid = true
        } = {}
    ) {
        const errorMessage = getValidationMessage(control);

        if (errorMessage) {
            if (showError) {
                setFieldError(form, control, errorMessage);
            }

            return false;
        }

        clearFieldError(form, control, markValid);

        return true;
    }

    function validateForm(form) {
        const controls = Array.from(
            form.querySelectorAll(selectors.field)
        );

        let firstInvalidControl = null;

        controls.forEach((control) => {
            state.touchedFields.add(control.name);

            const isValid = validateControl(form, control, {
                showError: true,
                markValid: true
            });

            if (!isValid && !firstInvalidControl) {
                firstInvalidControl = control;
            }
        });

        return {
            valid: firstInvalidControl === null,
            firstInvalidControl
        };
    }

    function focusInvalidControl(control) {
        if (!control) {
            return;
        }

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        control.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "center"
        });

        window.setTimeout(
            () => {
                control.focus({
                    preventScroll: true
                });
            },
            reducedMotion ? 0 : 280
        );
    }

    function setStatus(
        form,
        type,
        message,
        {
            focus = false
        } = {}
    ) {
        const status = form.querySelector(selectors.status);

        if (!status) {
            return;
        }

        status.classList.remove(
            "is-success",
            "is-error",
            "is-info",
            "is-visible"
        );

        status.removeAttribute("data-status");

        if (!message) {
            status.textContent = "";
            status.removeAttribute("tabindex");
            return;
        }

        status.textContent = message;
        status.dataset.status = type;
        status.classList.add(
            `is-${type}`,
            "is-visible"
        );

        if (focus) {
            status.setAttribute("tabindex", "-1");

            const reducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            status.scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
                block: "nearest"
            });

            window.setTimeout(
                () => {
                    status.focus({
                        preventScroll: true
                    });
                },
                reducedMotion ? 0 : 220
            );
        }
    }

    function clearStatus(form) {
        setStatus(form, "", "");
    }

    function setSubmittingState(form, submitting) {
        const submitButton = form.querySelector(
            selectors.submit
        );

        const submitLabel = form.querySelector(
            selectors.submitLabel
        );

        state.submitting = submitting;

        form.classList.toggle("is-submitting", submitting);

        form.setAttribute(
            "aria-busy",
            String(submitting)
        );

        if (submitButton) {
            submitButton.disabled = submitting;
        }

        if (submitLabel) {
            if (!submitLabel.dataset.defaultLabel) {
                submitLabel.dataset.defaultLabel =
                    submitLabel.textContent.trim();
            }

            submitLabel.textContent = submitting
                ? getConfiguredMessage(
                    "sending",
                    fallbackMessages.sending
                )
                : submitLabel.dataset.defaultLabel;
        }
    }

    function updateSourcePage(form) {
        const sourcePage = form.querySelector(
            selectors.sourcePage
        );

        if (!sourcePage) {
            return;
        }

        sourcePage.value =
            `${window.location.pathname}${window.location.search}`;
    }

    function getServiceCandidates(service) {
        return [
            service?.formValue,
            service?.name,
            service?.shortName,
            service?.slug,
            service?.id
        ]
            .filter(Boolean)
            .map(normalizeComparableValue);
    }

    function findMatchingService(queryValue) {
        const normalizedQuery =
            normalizeComparableValue(queryValue);

        if (!normalizedQuery) {
            return null;
        }

        const services = Array.isArray(config.services)
            ? config.services
            : [];

        return (
            services.find((service) =>
                getServiceCandidates(service).includes(
                    normalizedQuery
                )
            ) || null
        );
    }

    function findMatchingOption(select, queryValue) {
        const normalizedQuery =
            normalizeComparableValue(queryValue);

        return (
            Array.from(select.options).find((option) => {
                const optionValues = [
                    option.value,
                    option.textContent
                ].map(normalizeComparableValue);

                return optionValues.includes(normalizedQuery);
            }) || null
        );
    }

    function preselectServiceFromUrl(form) {
        const select = form.querySelector(
            selectors.serviceSelect
        );

        if (!select) {
            return;
        }

        const parameters = new URLSearchParams(
            window.location.search
        );

        const queryValue = parameters.get("service");

        if (!queryValue) {
            return;
        }

        const matchingService =
            findMatchingService(queryValue);

        const preferredValue =
            matchingService?.formValue ||
            matchingService?.name ||
            queryValue;

        const matchingOption =
            findMatchingOption(select, preferredValue) ||
            findMatchingOption(select, queryValue);

        if (!matchingOption || matchingOption.disabled) {
            return;
        }

        select.value = matchingOption.value;
        state.preselectedService = matchingOption.value;

        clearFieldError(form, select, true);

        select.dispatchEvent(
            new CustomEvent("bathnice:service-preselected", {
                bubbles: true,
                detail: {
                    value: matchingOption.value
                }
            })
        );
    }

    function initLiveValidation(form) {
        const controls = Array.from(
            form.querySelectorAll(selectors.field)
        );

        controls.forEach((control) => {
            const validateAfterInteraction = () => {
                if (
                    state.touchedFields.has(control.name) ||
                    control.getAttribute("aria-invalid") === "true"
                ) {
                    validateControl(form, control, {
                        showError: true,
                        markValid: true
                    });
                }
            };

            control.addEventListener("blur", () => {
                state.touchedFields.add(control.name);

                validateControl(form, control, {
                    showError: true,
                    markValid: true
                });
            });

            control.addEventListener("input", () => {
                form.classList.remove("is-success");

                if (
                    control.name === "fullName" ||
                    control.name === "email" ||
                    control.name === "phone" ||
                    control.name === "message"
                ) {
                    validateAfterInteraction();
                }
            });

            control.addEventListener("change", () => {
                form.classList.remove("is-success");
                state.touchedFields.add(control.name);

                validateControl(form, control, {
                    showError: true,
                    markValid: true
                });
            });
        });
    }

    function getResponseMessage(payload, fallback) {
        if (
            payload &&
            typeof payload.message === "string" &&
            payload.message.trim()
        ) {
            return payload.message.trim();
        }

        return fallback;
    }

    async function parseResponse(response) {
        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            try {
                return await response.json();
            } catch {
                return {};
            }
        }

        const responseText = await response.text();

        if (!responseText.trim()) {
            return {};
        }

        try {
            return JSON.parse(responseText);
        } catch {
            return {
                message: responseText.trim()
            };
        }
    }

    function applyServerFieldErrors(form, errors) {
        if (
            !errors ||
            typeof errors !== "object" ||
            Array.isArray(errors)
        ) {
            return null;
        }

        let firstInvalidControl = null;

        Object.entries(errors).forEach(
            ([fieldName, errorValue]) => {
                const control = getNamedControl(
                    form,
                    fieldName
                );

                if (!control) {
                    return;
                }

                const message = Array.isArray(errorValue)
                    ? errorValue.filter(Boolean).join(" ")
                    : String(errorValue || "").trim();

                if (!message) {
                    return;
                }

                state.touchedFields.add(fieldName);
                setFieldError(form, control, message);

                if (!firstInvalidControl) {
                    firstInvalidControl = control;
                }
            }
        );

        return firstInvalidControl;
    }

    function createSubmissionError(
        message,
        {
            fieldErrors = null,
            status = 0
        } = {}
    ) {
        const error = new Error(message);

        error.fieldErrors = fieldErrors;
        error.status = status;

        return error;
    }

    async function submitWithFetch(form, formData) {
        const endpoint =
            form.getAttribute("action") ||
            getFormConfig().endpoint ||
            "contact.php";

        const supportsAbortController =
            typeof window.AbortController === "function";

        state.abortController = supportsAbortController
            ? new AbortController()
            : null;

        const timeoutId = window.setTimeout(() => {
            state.abortController?.abort();
        }, 20000);

        try {
            const response = await window.fetch(endpoint, {
                method: "POST",
                body: formData,
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                signal: state.abortController?.signal
            });

            const payload = await parseResponse(response);

            if (
                !response.ok ||
                payload?.success === false
            ) {
                throw createSubmissionError(
                    getResponseMessage(
                        payload,
                        getConfiguredMessage(
                            "serverError",
                            fallbackMessages.serverError
                        )
                    ),
                    {
                        fieldErrors:
                            payload?.errors ||
                            payload?.fieldErrors ||
                            null,
                        status: response.status
                    }
                );
            }

            return payload;
        } finally {
            window.clearTimeout(timeoutId);
            state.abortController = null;
        }
    }

    function handleSuccessfulSubmission(form, payload) {
        const successMessage = getResponseMessage(
            payload,
            getConfiguredMessage(
                "success",
                fallbackMessages.success
            )
        );

        form.reset();
        clearAllValidation(form);
        form.classList.add("is-success");

        updateSourcePage(form);

        setStatus(
            form,
            "success",
            successMessage,
            {
                focus: true
            }
        );

        document.dispatchEvent(
            new CustomEvent("bathnice:request-success", {
                detail: {
                    response: payload || {}
                }
            })
        );
    }

    function handleSubmissionError(form, error) {
        const firstServerInvalidControl =
            applyServerFieldErrors(
                form,
                error?.fieldErrors
            );

        let message;

        if (error?.name === "AbortError") {
            message = getConfiguredMessage(
                "timeoutError",
                fallbackMessages.timeoutError
            );
        } else if (
            error instanceof TypeError &&
            !error.fieldErrors
        ) {
            message = getConfiguredMessage(
                "networkError",
                fallbackMessages.networkError
            );
        } else {
            message =
                error?.message ||
                getConfiguredMessage(
                    "serverError",
                    fallbackMessages.serverError
                );
        }

        setStatus(form, "error", message);

        if (firstServerInvalidControl) {
            focusInvalidControl(firstServerInvalidControl);
        }

        document.dispatchEvent(
            new CustomEvent("bathnice:request-error", {
                detail: {
                    message,
                    status: error?.status || 0
                }
            })
        );
    }

    function submitNatively(form) {
        HTMLFormElement.prototype.submit.call(form);
    }

    async function handleFormSubmission(event) {
        event.preventDefault();

        const form = event.currentTarget;

        if (state.submitting) {
            return;
        }

        clearStatus(form);
        form.classList.remove("is-success");

        const validationResult = validateForm(form);

        if (!validationResult.valid) {
            setStatus(
                form,
                "error",
                getConfiguredMessage(
                    "validationSummary",
                    fallbackMessages.validationSummary
                )
            );

            focusInvalidControl(
                validationResult.firstInvalidControl
            );

            return;
        }

        updateSourcePage(form);

        const formData = new FormData(form);
        const honeypotValue = normalizeText(
            formData.get("company")
        );

        if (honeypotValue) {
            handleSuccessfulSubmission(form, {
                success: true,
                message: getConfiguredMessage(
                    "success",
                    fallbackMessages.success
                )
            });

            return;
        }

        if (typeof window.fetch !== "function") {
            submitNatively(form);
            return;
        }

        setSubmittingState(form, true);

        setStatus(
            form,
            "info",
            getConfiguredMessage(
                "sending",
                fallbackMessages.sending
            )
        );

        try {
            const payload = await submitWithFetch(
                form,
                formData
            );

            handleSuccessfulSubmission(form, payload);
        } catch (error) {
            handleSubmissionError(form, error);
        } finally {
            setSubmittingState(form, false);
        }
    }

    function initContactForm() {
        const form = getForm();

        if (
            !form ||
            form.dataset.contactInitialized === "true"
        ) {
            return;
        }

        form.dataset.contactInitialized = "true";

        updateSourcePage(form);
        preselectServiceFromUrl(form);
        initLiveValidation(form);

        form.addEventListener(
            "submit",
            handleFormSubmission
        );

        form.addEventListener("reset", () => {
            window.requestAnimationFrame(() => {
                clearAllValidation(form);
                clearStatus(form);
                updateSourcePage(form);
            });
        });
    }

    function initContactPage() {
        if (
            state.initialized ||
            !isContactPage()
        ) {
            return;
        }

        state.initialized = true;

        initContactForm();

        document.dispatchEvent(
            new CustomEvent("bathnice:contact-ready")
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initContactPage,
            {
                once: true
            }
        );
    } else {
        initContactPage();
    }

    window.addEventListener(
        "pageshow",
        () => {
            const form = getForm();

            if (!form) {
                return;
            }

            setSubmittingState(form, false);
            updateSourcePage(form);
        }
    );
})();