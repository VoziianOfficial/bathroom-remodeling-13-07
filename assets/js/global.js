"use strict";

/**
 * BathNice global interface controller.
 *
 * Responsibilities:
 * - config data injection;
 * - global service-list rendering;
 * - active navigation states;
 * - sticky-header compact state;
 * - header-height synchronization;
 * - desktop services dropdown;
 * - full-screen mobile menu;
 * - accessible shared accordions;
 * - cookie consent;
 * - Lucide rendering;
 * - one global AOS initialization;
 * - image-mask reveals;
 * - hidden form source-page injection;
 * - current-year replacement.
 */

(() => {
    const config = window.BATHNICE_CONFIG;

    if (!config) {
        return;
    }

        const state = {
        mobileMenuOpen: false,
        previousFocusedElement: null,
        dropdownCloseTimer: null,
        aosInitialized: false,
        scrollTicking: false
    };

    const selectors = {
        header: ".site-header",
        main: "main",
        footer: ".site-footer",
        preFooterCta: ".prefooter-cta",

        dropdownItem: ".site-header__nav-item--services",
        dropdownToggle: ".site-header__services-toggle",
        dropdown: ".services-dropdown",
        dropdownLink: ".services-dropdown__link",

        mobileMenu: ".mobile-menu",
        mobileMenuOpen: "[data-menu-open]",
        mobileMenuClose: "[data-menu-close]",

        accordion: "[data-accordion]",
        accordionItem: "[data-accordion-item]",
        accordionTrigger: "[data-accordion-trigger]",
        accordionPanel: "[data-accordion-panel]",

        cookiePanel: ".cookie-consent",
        cookieAction: "[data-cookie-action]",

        imageMask: ".image-mask-reveal",
        backToTop: ".back-to-top"
    };

    const focusableSelector = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled]):not([type='hidden'])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    /**
     * Return a deeply nested configuration value using a dot path.
     * Example: getConfigValue("contact.phoneDisplay")
     */
    function getConfigValue(path) {
        if (!path || typeof path !== "string") {
            return undefined;
        }

        return path
            .split(".")
            .reduce((value, key) => {
                if (
                    value !== null &&
                    value !== undefined &&
                    Object.prototype.hasOwnProperty.call(value, key)
                ) {
                    return value[key];
                }

                return undefined;
            }, config);
    }

    function getCurrentYear() {
        return String(new Date().getFullYear());
    }

    function interpolateValue(value) {
        if (typeof value !== "string") {
            return value;
        }

        return value.replaceAll("{year}", getCurrentYear());
    }

    function getCurrentFileName() {
        const path = window.location.pathname;
        const lastSegment = path.split("/").filter(Boolean).pop();

        return lastSegment || "index.html";
    }

    function normalizeHref(href) {
        if (!href) {
            return "";
        }

        try {
            const url = new URL(href, window.location.href);
            const lastSegment = url.pathname.split("/").filter(Boolean).pop();

            return lastSegment || "index.html";
        } catch {
            return href.split("#")[0].split("?")[0];
        }
    }

    function createLucideIcon(iconName) {
        const icon = document.createElement("i");

        icon.setAttribute("data-lucide", iconName);
        icon.setAttribute("aria-hidden", "true");

        return icon;
    }

    function setElementText(element, value) {
        if (
            !element ||
            value === undefined ||
            value === null ||
            typeof value === "object"
        ) {
            return;
        }

        element.textContent = String(interpolateValue(value));
    }

    function applyConfigText(root = document) {
        root.querySelectorAll("[data-config]").forEach((element) => {
            const path = element.dataset.config;
            const value = getConfigValue(path);

            setElementText(element, value);
        });

        root.querySelectorAll("[data-current-year]").forEach((element) => {
            element.textContent = getCurrentYear();
        });
    }

    function applyConfigHref(root = document) {
        root.querySelectorAll("[data-config-href]").forEach((element) => {
            const path = element.dataset.configHref;
            const value = getConfigValue(path);

            if (typeof value === "string" && value.trim()) {
                element.setAttribute("href", value);
            }
        });
    }

    function applyConfigSrc(root = document) {
        root.querySelectorAll("[data-config-src]").forEach((element) => {
            const path = element.dataset.configSrc;
            const value = getConfigValue(path);

            if (typeof value === "string" && value.trim()) {
                element.setAttribute("src", value);
            }
        });
    }

    function applyConfigValues(root = document) {
        root.querySelectorAll("[data-config-value]").forEach((element) => {
            const path = element.dataset.configValue;
            const value = getConfigValue(path);

            if (
                "value" in element &&
                value !== undefined &&
                value !== null &&
                typeof value !== "object"
            ) {
                element.value = String(interpolateValue(value));
            }
        });
    }

    /**
     * Supports:
     * data-config-attr="
     *   aria-label:accessibility.phoneActionLabel;
     *   title:contact.phoneDisplay
     * "
     */
    function applyConfigAttributes(root = document) {
        root.querySelectorAll("[data-config-attr]").forEach((element) => {
            const definitions = element.dataset.configAttr
                .split(";")
                .map((definition) => definition.trim())
                .filter(Boolean);

            definitions.forEach((definition) => {
                const separatorIndex = definition.indexOf(":");

                if (separatorIndex === -1) {
                    return;
                }

                const attributeName = definition
                    .slice(0, separatorIndex)
                    .trim();

                const configPath = definition
                    .slice(separatorIndex + 1)
                    .trim();

                const value = getConfigValue(configPath);

                if (
                    attributeName &&
                    value !== undefined &&
                    value !== null &&
                    typeof value !== "object"
                ) {
                    element.setAttribute(
                        attributeName,
                        String(interpolateValue(value))
                    );
                }
            });
        });
    }

    function applyLogoSources(root = document) {
        root.querySelectorAll("[data-logo]").forEach((image) => {
            const variant = image.dataset.logo;

            if (variant === "light") {
                image.setAttribute("src", "assets/images/logo-light.svg");
            }

            if (variant === "dark") {
                image.setAttribute("src", "assets/images/logo-dark.svg");
            }

            if (!image.getAttribute("alt")) {
                image.setAttribute("alt", config.brand.name);
            }
        });
    }

    function injectSourcePage(root = document) {
        root
            .querySelectorAll('input[name="sourcePage"]')
            .forEach((input) => {
                input.value = window.location.pathname || getCurrentFileName();
            });
    }

    function applyConfig(root = document) {
        applyConfigText(root);
        applyConfigHref(root);
        applyConfigSrc(root);
        applyConfigValues(root);
        applyConfigAttributes(root);
        applyLogoSources(root);
        injectSourcePage(root);
    }

    /**
     * Service-list modes:
     *
     * data-service-list="dropdown"
     * data-service-list="mobile"
     * data-service-list="footer"
     * data-service-list="select"
     * data-service-list="simple"
     */
    function createServiceLink(service, mode) {
        const currentFile = getCurrentFileName();
        const item = document.createElement("li");
        const link = document.createElement("a");

        link.href = service.url;
        link.dataset.serviceSlug = service.slug;

        if (normalizeHref(service.url) === currentFile) {
            link.setAttribute("aria-current", "page");
        }

        if (mode === "dropdown") {
            item.className = "services-dropdown__item";
            link.className = "services-dropdown__link";

            const label = document.createElement("span");
            label.textContent = service.name;

            link.append(label, createLucideIcon("arrow-right"));
        } else if (mode === "mobile") {
            item.className = "mobile-menu__service-item";
            link.className = "mobile-menu__service-link";

            link.append(
                createLucideIcon(service.icon || "arrow-right")
            );

            const label = document.createElement("span");
            label.textContent = service.name;

            link.append(label);
        } else if (mode === "footer") {
            item.className = "site-footer__link-item";
            link.className = "site-footer__link";
            link.textContent = service.name;
        } else {
            item.className = "service-list__item";
            link.className = "service-list__link";
            link.textContent = service.name;
        }

        item.append(link);

        return item;
    }

    function renderServiceSelect(select) {
        const existingValue = select.value;
        const placeholder =
            select.dataset.servicePlaceholder ||
            config.form.servicePlaceholder;

        select.replaceChildren();

        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = placeholder;
        placeholderOption.disabled = true;
        placeholderOption.selected = !existingValue;

        select.append(placeholderOption);

        config.services.forEach((service) => {
            const option = document.createElement("option");

            option.value = service.formValue;
            option.textContent = service.name;

            if (existingValue === service.formValue) {
                option.selected = true;
                placeholderOption.selected = false;
            }

            select.append(option);
        });
    }

    function renderServiceLists(root = document) {
        root.querySelectorAll("[data-service-list]").forEach((target) => {
            const mode = target.dataset.serviceList || "simple";

            if (
                target instanceof HTMLSelectElement ||
                mode === "select"
            ) {
                renderServiceSelect(target);
                return;
            }

            const fragment = document.createDocumentFragment();

            config.services.forEach((service) => {
                fragment.append(createServiceLink(service, mode));
            });

            target.replaceChildren(fragment);
        });
    }

    function renderMainNavigation(root = document) {
        root
            .querySelectorAll("[data-main-navigation]")
            .forEach((target) => {
                const mode = target.dataset.mainNavigation;
                const fragment = document.createDocumentFragment();

                config.navigation.main.forEach((item) => {
                    const url = config.urls[item.urlKey];

                    if (!url) {
                        return;
                    }

                    const listItem = document.createElement("li");
                    const link = document.createElement("a");

                    link.href = url;
                    link.textContent = item.label;

                    if (mode === "mobile") {
                        listItem.className = "mobile-menu__primary-item";
                        link.className = "mobile-menu__primary-link";
                        link.append(createLucideIcon("arrow-up-right"));
                    } else if (mode === "footer") {
                        listItem.className = "site-footer__link-item";
                        link.className = "site-footer__link";
                    } else {
                        listItem.className = "site-header__nav-item";
                        link.className = "site-header__nav-link";
                    }

                    fragment.append(listItem);
                    listItem.append(link);
                });

                target.replaceChildren(fragment);
            });
    }

    function setActiveNavigation(root = document) {
        const currentFile = getCurrentFileName();

        root
            .querySelectorAll(
                "a[href]:not([href^='#']):not([href^='tel:']):not([href^='mailto:'])"
            )
            .forEach((link) => {
                const targetFile = normalizeHref(link.getAttribute("href"));

                if (targetFile === currentFile) {
                    link.setAttribute("aria-current", "page");
                } else if (link.getAttribute("aria-current") === "page") {
                    link.removeAttribute("aria-current");
                }
            });

        const servicePages = config.services.map((service) =>
            normalizeHref(service.url)
        );

        if (servicePages.includes(currentFile)) {
            document
                .querySelectorAll(
                    '.site-header__services-link[href="all-services.html"]'
                )
                .forEach((link) => {
                    link.setAttribute("aria-current", "page");
                });
        }
    }

    function refreshLucideIcons() {
        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            window.lucide.createIcons({
                attrs: {
                    "stroke-width": 1.6
                }
            });
        }
    }

    function updateHeaderHeight() {
        const header = document.querySelector(selectors.header);

        if (!header) {
            return;
        }

        const height = Math.round(
            header.getBoundingClientRect().height
        );

        if (height > 0) {
            document.documentElement.style.setProperty(
                "--header-height",
                `${height}px`
            );

            document.documentElement.style.setProperty(
                "--sticky-offset",
                `calc(${height}px + 24px)`
            );
        }
    }

    function initHeaderHeightObserver() {
        const header = document.querySelector(selectors.header);

        if (!header) {
            return;
        }

        updateHeaderHeight();

        if ("ResizeObserver" in window) {
            const observer = new ResizeObserver(() => {
                updateHeaderHeight();
            });

            observer.observe(header);
        } else {
            window.addEventListener("resize", updateHeaderHeight, {
                passive: true
            });
        }
    }

    function updateHeaderCompactState() {
        const header = document.querySelector(selectors.header);

        if (!header) {
            state.scrollTicking = false;
            return;
        }

        header.classList.toggle(
            "is-compact",
            window.scrollY > 40
        );

        updateHeaderHeight();
        state.scrollTicking = false;
    }

    function initStickyHeader() {
        const header = document.querySelector(selectors.header);

        if (!header) {
            return;
        }

        updateHeaderCompactState();

        window.addEventListener(
            "scroll",
            () => {
                if (state.scrollTicking) {
                    return;
                }

                state.scrollTicking = true;
                window.requestAnimationFrame(updateHeaderCompactState);
            },
            {
                passive: true
            }
        );
    }

    function updateBackToTopState(button) {
        const revealPoint = Math.max(
            600,
            window.innerHeight * 0.75
        );

        const isVisible = window.scrollY > revealPoint;

        button.classList.toggle("is-visible", isVisible);
        button.setAttribute("aria-hidden", String(!isVisible));
        button.tabIndex = isVisible ? 0 : -1;
    }

    function initBackToTop() {
        let button = document.querySelector(
            selectors.backToTop
        );

        if (!button) {
            button = document.createElement("button");
            button.className = "back-to-top";
            button.type = "button";
            button.append(createLucideIcon("arrow-up"));
            document.body.append(button);
        }

        const label =
            config.accessibility?.backToTopLabel ||
            "Back to top";

        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);

        updateBackToTopState(button);

        button.addEventListener("click", () => {
            const reducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            window.scrollTo({
                top: 0,
                behavior: reducedMotion ? "auto" : "smooth"
            });

            const main = document.querySelector(selectors.main);

            if (main instanceof HTMLElement) {
                if (!main.hasAttribute("tabindex")) {
                    main.setAttribute("tabindex", "-1");
                }

                window.setTimeout(() => {
                    main.focus({
                        preventScroll: true
                    });
                }, 0);
            }
        });

        window.addEventListener(
            "scroll",
            () => {
                updateBackToTopState(button);
            },
            {
                passive: true
            }
        );
    }

    function getDropdownElements() {
        const dropdownItem = document.querySelector(
            selectors.dropdownItem
        );

        const toggle = document.querySelector(
            selectors.dropdownToggle
        );

        const dropdown = document.querySelector(
            selectors.dropdown
        );

        return {
            dropdownItem,
            toggle,
            dropdown
        };
    }

    function isDropdownOpen() {
        const { toggle } = getDropdownElements();

        return toggle?.getAttribute("aria-expanded") === "true";
    }

    function openServicesDropdown({
        focusFirst = false
    } = {}) {
        const { toggle, dropdown } = getDropdownElements();

        if (!toggle || !dropdown) {
            return;
        }

        window.clearTimeout(state.dropdownCloseTimer);

        toggle.setAttribute("aria-expanded", "true");
        dropdown.classList.add("is-open");
        dropdown.setAttribute("aria-hidden", "false");

        if (focusFirst) {
            const firstLink = dropdown.querySelector(
                selectors.dropdownLink
            );

            firstLink?.focus();
        }
    }

    function closeServicesDropdown({
        restoreFocus = false
    } = {}) {
        const { toggle, dropdown } = getDropdownElements();

        if (!toggle || !dropdown) {
            return;
        }

        window.clearTimeout(state.dropdownCloseTimer);

        toggle.setAttribute("aria-expanded", "false");
        dropdown.classList.remove("is-open");
        dropdown.setAttribute("aria-hidden", "true");

        if (restoreFocus) {
            toggle.focus();
        }
    }

    function scheduleDropdownClose() {
        window.clearTimeout(state.dropdownCloseTimer);

        state.dropdownCloseTimer = window.setTimeout(() => {
            const activeElement = document.activeElement;
            const { dropdownItem } = getDropdownElements();

            if (
                dropdownItem &&
                !dropdownItem.contains(activeElement)
            ) {
                closeServicesDropdown();
            }
        }, 160);
    }

    function initServicesDropdown() {
        const { dropdownItem, toggle, dropdown } =
            getDropdownElements();

        if (!dropdownItem || !toggle || !dropdown) {
            return;
        }

        toggle.setAttribute("aria-expanded", "false");
        dropdown.setAttribute("aria-hidden", "true");

        toggle.addEventListener("click", () => {
            if (isDropdownOpen()) {
                closeServicesDropdown();
            } else {
                openServicesDropdown();
            }
        });

        toggle.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                openServicesDropdown({
                    focusFirst: true
                });
            }

            if (event.key === "Escape") {
                event.preventDefault();
                closeServicesDropdown({
                    restoreFocus: true
                });
            }
        });

        dropdownItem.addEventListener("pointerenter", () => {
            if (
                window.matchMedia("(hover: hover) and (pointer: fine)")
                    .matches
            ) {
                openServicesDropdown();
            }
        });

        dropdownItem.addEventListener(
            "pointerleave",
            scheduleDropdownClose
        );

        dropdown.addEventListener("pointerenter", () => {
            window.clearTimeout(state.dropdownCloseTimer);
        });

        dropdown.addEventListener(
            "pointerleave",
            scheduleDropdownClose
        );

        dropdownItem.addEventListener("focusin", () => {
            window.clearTimeout(state.dropdownCloseTimer);
        });

        dropdownItem.addEventListener("focusout", () => {
            window.setTimeout(() => {
                if (!dropdownItem.contains(document.activeElement)) {
                    closeServicesDropdown();
                }
            }, 0);
        });

        dropdown.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeServicesDropdown({
                    restoreFocus: true
                });
            }
        });

        document.addEventListener("pointerdown", (event) => {
            if (
                isDropdownOpen() &&
                !dropdownItem.contains(event.target)
            ) {
                closeServicesDropdown();
            }
        });
    }

    function getMobileMenuElements() {
        return {
            menu: document.querySelector(selectors.mobileMenu),
            openButtons: Array.from(
                document.querySelectorAll(selectors.mobileMenuOpen)
            ),
            closeButtons: Array.from(
                document.querySelectorAll(selectors.mobileMenuClose)
            )
        };
    }

    function getMenuFocusableElements(menu) {
        if (!menu) {
            return [];
        }

        return Array.from(
            menu.querySelectorAll(focusableSelector)
        ).filter((element) => {
            return (
                !element.hasAttribute("disabled") &&
                element.getAttribute("aria-hidden") !== "true" &&
                element.offsetParent !== null
            );
        });
    }

    function setPageInert(isInert) {
        [
            document.querySelector(selectors.main),
            document.querySelector(selectors.footer),
            document.querySelector(selectors.preFooterCta)
        ]
            .filter(Boolean)
            .forEach((element) => {
                if (isInert) {
                    element.setAttribute("inert", "");
                    element.setAttribute("aria-hidden", "true");
                } else {
                    element.removeAttribute("inert");
                    element.removeAttribute("aria-hidden");
                }
            });
    }

    function openMobileMenu(trigger = null) {
        const { menu, openButtons } = getMobileMenuElements();

        if (!menu || state.mobileMenuOpen) {
            return;
        }

        state.mobileMenuOpen = true;
        state.previousFocusedElement =
            trigger instanceof HTMLElement
                ? trigger
                : document.activeElement;

        closeServicesDropdown();

        menu.classList.add("is-open");
        menu.setAttribute("aria-hidden", "false");

        openButtons.forEach((button) => {
            button.setAttribute("aria-expanded", "true");
        });

        document.body.classList.add("menu-open");
        setPageInert(true);

        window.setTimeout(() => {
            if (!state.mobileMenuOpen) {
                return;
            }

            const focusable = getMenuFocusableElements(menu);
            focusable[0]?.focus({
                preventScroll: true
            });

            if (!menu.contains(document.activeElement)) {
                menu.tabIndex = -1;
                menu.focus({
                    preventScroll: true
                });
            }
        }, 0);
    }

    function closeMobileMenu({
        restoreFocus = true
    } = {}) {
        const { menu, openButtons } = getMobileMenuElements();

        if (!menu || !state.mobileMenuOpen) {
            return;
        }

        state.mobileMenuOpen = false;

        menu.classList.remove("is-open");
        menu.setAttribute("aria-hidden", "true");

        openButtons.forEach((button) => {
            button.setAttribute("aria-expanded", "false");
        });

        document.body.classList.remove("menu-open");
        setPageInert(false);

        if (
            restoreFocus &&
            state.previousFocusedElement instanceof HTMLElement
        ) {
            state.previousFocusedElement.focus();
        }

        state.previousFocusedElement = null;
    }

    function trapMobileMenuFocus(event) {
        if (!state.mobileMenuOpen || event.key !== "Tab") {
            return;
        }

        const { menu } = getMobileMenuElements();
        const focusable = getMenuFocusableElements(menu);

        if (!focusable.length) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (
            event.shiftKey &&
            document.activeElement === first
        ) {
            event.preventDefault();
            last.focus();
            return;
        }

        if (
            !event.shiftKey &&
            document.activeElement === last
        ) {
            event.preventDefault();
            first.focus();
        }
    }

    function initMobileMenu() {
        const { menu, openButtons, closeButtons } =
            getMobileMenuElements();

        if (!menu || !openButtons.length) {
            return;
        }

        menu.setAttribute("aria-hidden", "true");

        openButtons.forEach((button) => {
            button.setAttribute("aria-expanded", "false");

            button.addEventListener("click", () => {
                openMobileMenu(button);
            });
        });

        closeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                closeMobileMenu();
            });
        });

        menu.addEventListener("click", (event) => {
            const link = event.target.closest("a[href]");

            if (link) {
                closeMobileMenu({
                    restoreFocus: false
                });
            }
        });

        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Escape" &&
                state.mobileMenuOpen
            ) {
                event.preventDefault();
                closeMobileMenu();
                return;
            }

            trapMobileMenuFocus(event);
        });

        window.addEventListener(
            "resize",
            () => {
                if (
                    state.mobileMenuOpen &&
                    window.innerWidth > 1100
                ) {
                    closeMobileMenu({
                        restoreFocus: false
                    });
                }
            },
            {
                passive: true
            }
        );
    }

    function getAccordionMode(accordion) {
        return accordion.dataset.accordion === "multiple"
            ? "multiple"
            : "single";
    }

    function setAccordionPanelState(
        trigger,
        panel,
        isOpen,
        useMotion = true
    ) {
        trigger.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        panel.setAttribute(
            "aria-hidden",
            String(!isOpen)
        );

        if (!useMotion) {
            panel.style.height = isOpen
                ? "auto"
                : "0px";

            if (!isOpen) {
                panel.hidden = true;
            }

            return;
        }

        panel.hidden = false;

        if (isOpen) {
            panel.style.height = "0px";

            window.requestAnimationFrame(() => {
                panel.style.height = `${panel.scrollHeight}px`;
            });

            const handleOpenEnd = (event) => {
                if (
                    event.propertyName === "height" &&
                    trigger.getAttribute("aria-expanded") === "true"
                ) {
                    panel.style.height = "auto";
                    panel.removeEventListener(
                        "transitionend",
                        handleOpenEnd
                    );
                }
            };

            panel.addEventListener(
                "transitionend",
                handleOpenEnd
            );
        } else {
            if (panel.style.height === "auto") {
                panel.style.height = `${panel.scrollHeight}px`;
            }

            window.requestAnimationFrame(() => {
                panel.style.height = "0px";
            });

            const handleCloseEnd = (event) => {
                if (
                    event.propertyName === "height" &&
                    trigger.getAttribute("aria-expanded") === "false"
                ) {
                    panel.hidden = true;
                    panel.removeEventListener(
                        "transitionend",
                        handleCloseEnd
                    );
                }
            };

            panel.addEventListener(
                "transitionend",
                handleCloseEnd
            );
        }
    }

    function closeSiblingAccordionItems(
        accordion,
        activeItem
    ) {
        if (getAccordionMode(accordion) !== "single") {
            return;
        }

        accordion
            .querySelectorAll(selectors.accordionItem)
            .forEach((item) => {
                if (item === activeItem) {
                    return;
                }

                const trigger = item.querySelector(
                    selectors.accordionTrigger
                );

                const panel = item.querySelector(
                    selectors.accordionPanel
                );

                if (
                    trigger &&
                    panel &&
                    trigger.getAttribute("aria-expanded") === "true"
                ) {
                    setAccordionPanelState(
                        trigger,
                        panel,
                        false
                    );
                }
            });
    }

    function initializeAccordionItem(
        accordion,
        item,
        itemIndex,
        accordionIndex
    ) {
        const trigger = item.querySelector(
            selectors.accordionTrigger
        );

        const panel = item.querySelector(
            selectors.accordionPanel
        );

        if (!trigger || !panel) {
            return;
        }

        const triggerId =
            trigger.id ||
            `accordion-${accordionIndex}-trigger-${itemIndex}`;

        const panelId =
            panel.id ||
            `accordion-${accordionIndex}-panel-${itemIndex}`;

        trigger.id = triggerId;
        panel.id = panelId;

        trigger.setAttribute("aria-controls", panelId);
        panel.setAttribute("aria-labelledby", triggerId);
        panel.setAttribute("role", "region");

        const initiallyOpen =
            trigger.getAttribute("aria-expanded") === "true" ||
            item.hasAttribute("data-accordion-open");

        setAccordionPanelState(
            trigger,
            panel,
            initiallyOpen,
            false
        );

        trigger.addEventListener("click", () => {
            const willOpen =
                trigger.getAttribute("aria-expanded") !== "true";

            if (willOpen) {
                closeSiblingAccordionItems(accordion, item);
            }

            setAccordionPanelState(
                trigger,
                panel,
                willOpen
            );
        });

        trigger.addEventListener("keydown", (event) => {
            const triggers = Array.from(
                accordion.querySelectorAll(
                    selectors.accordionTrigger
                )
            );

            const currentIndex = triggers.indexOf(trigger);

            if (event.key === "ArrowDown") {
                event.preventDefault();

                triggers[
                    (currentIndex + 1) % triggers.length
                ]?.focus();
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();

                triggers[
                    (currentIndex - 1 + triggers.length) %
                    triggers.length
                ]?.focus();
            }

            if (event.key === "Home") {
                event.preventDefault();
                triggers[0]?.focus();
            }

            if (event.key === "End") {
                event.preventDefault();
                triggers[triggers.length - 1]?.focus();
            }
        });
    }

    function initAccordions(root = document) {
        root
            .querySelectorAll(selectors.accordion)
            .forEach((accordion, accordionIndex) => {
                if (accordion.dataset.accordionInitialized === "true") {
                    return;
                }

                accordion.dataset.accordionInitialized = "true";

                accordion
                    .querySelectorAll(selectors.accordionItem)
                    .forEach((item, itemIndex) => {
                        initializeAccordionItem(
                            accordion,
                            item,
                            itemIndex,
                            accordionIndex
                        );
                    });
            });
    }

    function safelyReadStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    function safelyWriteStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function showCookiePanel(panel) {
        panel.hidden = false;

        window.requestAnimationFrame(() => {
            panel.classList.add("is-visible");
        });
    }

    function hideCookiePanel(panel) {
        panel.classList.remove("is-visible");

        const removeAfterTransition = () => {
            panel.hidden = true;
            panel.removeEventListener(
                "transitionend",
                removeAfterTransition
            );
        };

        panel.addEventListener(
            "transitionend",
            removeAfterTransition
        );

        window.setTimeout(() => {
            panel.hidden = true;
        }, 400);
    }

    function initCookieConsent() {
        const panel = document.querySelector(
            selectors.cookiePanel
        );

        if (!panel) {
            return;
        }

        const storageKey = config.cookieConsent.storageKey;
        const version = config.cookieConsent.version;
        const savedValue = safelyReadStorage(storageKey);

        panel.hidden = true;

        let savedChoice = null;

        if (savedValue) {
            try {
                savedChoice = JSON.parse(savedValue);
            } catch {
                savedChoice = null;
            }
        }

        if (
            !savedChoice ||
            savedChoice.version !== version ||
            !["accepted", "declined"].includes(
                savedChoice.choice
            )
        ) {
            showCookiePanel(panel);
        } else {
            document.documentElement.dataset.cookieConsent =
                savedChoice.choice;
        }

        panel
            .querySelectorAll(selectors.cookieAction)
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const choice = button.dataset.cookieAction;

                    if (
                        !["accepted", "declined"].includes(choice)
                    ) {
                        return;
                    }

                    safelyWriteStorage(
                        storageKey,
                        JSON.stringify({
                            choice,
                            version,
                            updatedAt: new Date().toISOString()
                        })
                    );

                    document.documentElement.dataset.cookieConsent =
                        choice;

                    hideCookiePanel(panel);
                });
            });
    }

    function initImageMaskReveals() {
        const elements = Array.from(
            document.querySelectorAll(selectors.imageMask)
        );

        if (!elements.length) {
            return;
        }

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        if (
            reducedMotion ||
            !("IntersectionObserver" in window)
        ) {
            elements.forEach((element) => {
                element.classList.add("is-visible");
            });

            return;
        }

        document.documentElement.classList.add(
            "image-reveals-ready"
        );

        const observer = new IntersectionObserver(
            (entries, revealObserver) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                });
            },
            {
                rootMargin: "0px 0px -10% 0px",
                threshold: 0.12
            }
        );

        elements.forEach((element) => {
            observer.observe(element);
        });
    }

    function initAOS() {
        if (state.aosInitialized) {
            return;
        }

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        if (reducedMotion) {
            document
                .querySelectorAll("[data-aos]")
                .forEach((element) => {
                    element.removeAttribute("data-aos");
                    element.removeAttribute("data-aos-delay");
                    element.removeAttribute("data-aos-duration");
                });

            return;
        }

        if (
            window.AOS &&
            typeof window.AOS.init === "function"
        ) {
            try {
                document.documentElement.classList.add(
                    "aos-ready"
                );

                window.AOS.init({
                    once: true,
                    mirror: false,
                    offset: 80,
                    duration: 760,
                    easing:
                        "cubic-bezier(0.22, 1, 0.36, 1)",
                    anchorPlacement: "top-bottom",
                    disable: () => {
                        return window.matchMedia(
                            "(prefers-reduced-motion: reduce)"
                        ).matches;
                    }
                });

                state.aosInitialized = true;
            } catch (error) {
                document.documentElement.classList.remove(
                    "aos-ready"
                );
                console.warn("AOS enhancement unavailable.", error);
            }
        }
    }

    function initExternalSecurity() {
        document
            .querySelectorAll('a[target="_blank"]')
            .forEach((link) => {
                const rel = new Set(
                    (link.getAttribute("rel") || "")
                        .split(/\s+/)
                        .filter(Boolean)
                );

                rel.add("noopener");
                rel.add("noreferrer");

                link.setAttribute(
                    "rel",
                    Array.from(rel).join(" ")
                );
            });
    }

    function dispatchReadyEvent() {
        document.dispatchEvent(
            new CustomEvent("bathnice:global-ready", {
                detail: {
                    currentPage: getCurrentFileName()
                }
            })
        );
    }

    function initGlobalPage() {
        renderMainNavigation(document);
        renderServiceLists(document);
        applyConfig(document);
        setActiveNavigation(document);

        initBackToTop();
        refreshLucideIcons();

        initHeaderHeightObserver();
        initStickyHeader();
        initServicesDropdown();
        initMobileMenu();
        initAccordions(document);
        initCookieConsent();
        initImageMaskReveals();
        initExternalSecurity();
        initAOS();

        document.documentElement.classList.remove("no-js");
        document.documentElement.classList.add("js-enhanced");

        dispatchReadyEvent();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initGlobalPage,
            {
                once: true
            }
        );
    } else {
        initGlobalPage();
    }

    window.addEventListener(
        "load",
        () => {
            updateHeaderHeight();
        },
        {
            once: true
        }
    );

    if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
            updateHeaderHeight();
        });
    }
})();
