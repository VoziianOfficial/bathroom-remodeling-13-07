"use strict";

/**
 * BathNice homepage interactions.
 *
 * Responsibilities:
 * - responsive service-mosaic Swiper;
 * - material-decisions Swiper;
 * - responsive final photo-story Swiper;
 * - accessible style explorer;
 * - accessible bathroom hotspots;
 * - desktop autoplay management;
 * - reduced-motion handling.
 */

(() => {
    const state = {
        initialized: false,
        serviceSwiper: null,
        materialsSwiper: null,
        storySwiper: null,
        styleRequestId: 0,
        activeHotspot: null,
        previousHotspotTrigger: null
    };

    const selectors = {
        page: ".home-page",

        serviceSwiper: "[data-home-service-swiper]",

        materialsSwiper: "[data-home-materials-swiper]",
        materialsPrevious: ".home-materials__prev",
        materialsNext: ".home-materials__next",
        materialsProgress: "[data-home-materials-progress]",

        storySwiper: "[data-home-story-swiper]",

        styleExplorer: "[data-style-explorer]",
        styleTab: "[data-style-tab]",
        styleMedia: "[data-style-media]",
        styleImage: "[data-style-image]",
        styleTitle: "[data-style-title]",
        styleDescription: "[data-style-description]",
        styleMaterials: "[data-style-materials]",
        styleCaption: "[data-style-caption]",

        hotspots: "[data-hotspots]",
        hotspotButton: "[data-hotspot-button]",
        hotspotPanel: "[data-hotspot-panel]",
        hotspotClose: "[data-hotspot-close]"
    };

    const mobileMedia = window.matchMedia("(max-width: 768px)");
    const reducedMotionMedia = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function isHomePage() {
        return Boolean(document.querySelector(selectors.page));
    }

    function hasSwiperLibrary() {
        return typeof window.Swiper === "function";
    }

    function refreshAOS() {
        if (
            window.AOS &&
            typeof window.AOS.refresh === "function"
        ) {
            window.requestAnimationFrame(() => {
                window.AOS.refresh();
            });
        }
    }

    function addMediaListener(mediaQuery, handler) {
        if (
            typeof mediaQuery.addEventListener === "function"
        ) {
            mediaQuery.addEventListener("change", handler);
            return;
        }

        if (typeof mediaQuery.addListener === "function") {
            mediaQuery.addListener(handler);
        }
    }

    function destroySwiper(instance) {
        if (
            !instance ||
            typeof instance.destroy !== "function"
        ) {
            return null;
        }

        instance.destroy(true, true);

        return null;
    }

    /* =======================================================
       Service Mosaic
       ======================================================= */

    function initServiceMosaicSwiper() {
        const root = document.querySelector(
            selectors.serviceSwiper
        );

        if (
            !root ||
            !hasSwiperLibrary() ||
            !mobileMedia.matches ||
            state.serviceSwiper
        ) {
            return;
        }

        const slides = root.querySelectorAll(".swiper-slide");

        if (slides.length < 2) {
            return;
        }

        state.serviceSwiper = new window.Swiper(root, {
            slidesPerView: "auto",
            spaceBetween: 12,
            speed: reducedMotionMedia.matches ? 1 : 620,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            grabCursor: true,
            resistanceRatio: 0.72,

            keyboard: {
                enabled: true,
                onlyInViewport: true
            },

            a11y: {
                enabled: true,
                containerMessage:
                    "Bathroom remodeling service categories",
                slideLabelMessage:
                    "{{index}} of {{slidesLength}}"
            }
        });

        refreshAOS();
    }

    function destroyServiceMosaicSwiper() {
        state.serviceSwiper = destroySwiper(
            state.serviceSwiper
        );
    }

    function updateServiceMosaicMode() {
        if (mobileMedia.matches) {
            initServiceMosaicSwiper();
        } else {
            destroyServiceMosaicSwiper();
        }
    }

    /* =======================================================
       Material Decisions Slider
       ======================================================= */

    function getMaterialsProgressPercentage(swiper) {
        const slideCount = swiper.slides?.length || 0;

        if (!slideCount) {
            return 0;
        }

        const visiblePosition = Math.min(
            swiper.activeIndex + 1,
            slideCount
        );

        return Math.max(
            100 / slideCount,
            (visiblePosition / slideCount) * 100
        );
    }

    function updateMaterialsProgress(swiper) {
        const progressBar = document.querySelector(
            selectors.materialsProgress
        );

        if (!progressBar || !swiper) {
            return;
        }

        const percentage =
            getMaterialsProgressPercentage(swiper);

        progressBar.style.width = `${percentage}%`;
    }

    function shouldMaterialsAutoplay() {
        return (
            !mobileMedia.matches &&
            !reducedMotionMedia.matches
        );
    }

    function stopMaterialsAutoplay() {
        const autoplay = state.materialsSwiper?.autoplay;

        if (
            autoplay &&
            typeof autoplay.stop === "function"
        ) {
            autoplay.stop();
        }
    }

    function startMaterialsAutoplay() {
        if (!shouldMaterialsAutoplay()) {
            return;
        }

        const autoplay = state.materialsSwiper?.autoplay;

        if (
            autoplay &&
            typeof autoplay.start === "function"
        ) {
            autoplay.start();
        }
    }

    function updateMaterialsAutoplayMode() {
        if (!state.materialsSwiper) {
            return;
        }

        if (shouldMaterialsAutoplay()) {
            startMaterialsAutoplay();
        } else {
            stopMaterialsAutoplay();
        }
    }

    function initMaterialsInteractionPause(root) {
        if (!root || root.dataset.pauseInitialized === "true") {
            return;
        }

        root.dataset.pauseInitialized = "true";

        root.addEventListener("pointerenter", () => {
            stopMaterialsAutoplay();
        });

        root.addEventListener("pointerleave", () => {
            startMaterialsAutoplay();
        });

        root.addEventListener("focusin", () => {
            stopMaterialsAutoplay();
        });

        root.addEventListener("focusout", (event) => {
            if (!root.contains(event.relatedTarget)) {
                startMaterialsAutoplay();
            }
        });

        root.addEventListener(
            "touchstart",
            () => {
                stopMaterialsAutoplay();
            },
            {
                passive: true
            }
        );

        root.addEventListener(
            "touchend",
            () => {
                window.setTimeout(() => {
                    startMaterialsAutoplay();
                }, 1800);
            },
            {
                passive: true
            }
        );
    }

    function initMaterialsSwiper() {
        const root = document.querySelector(
            selectors.materialsSwiper
        );

        if (
            !root ||
            !hasSwiperLibrary() ||
            state.materialsSwiper
        ) {
            return;
        }

        const slides = root.querySelectorAll(".swiper-slide");

        if (slides.length < 2) {
            return;
        }

        const autoplayOptions = shouldMaterialsAutoplay()
            ? {
                delay: 4200,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            }
            : false;

        state.materialsSwiper = new window.Swiper(root, {
            slidesPerView: "auto",
            spaceBetween: 20,
            speed: reducedMotionMedia.matches ? 1 : 680,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            grabCursor: true,
            resistanceRatio: 0.72,
            autoplay: autoplayOptions,

            navigation: {
                previousEl: selectors.materialsPrevious,
                nextEl: selectors.materialsNext
            },

            keyboard: {
                enabled: true,
                onlyInViewport: true
            },

            a11y: {
                enabled: true,
                previousSlideMessage:
                    "Show previous planning factor",
                nextSlideMessage:
                    "Show next planning factor",
                containerMessage:
                    "Bathroom material and planning decisions",
                slideLabelMessage:
                    "{{index}} of {{slidesLength}}"
            },

            on: {
                init(swiper) {
                    updateMaterialsProgress(swiper);
                },

                slideChange(swiper) {
                    updateMaterialsProgress(swiper);
                },

                resize(swiper) {
                    updateMaterialsProgress(swiper);
                },

                observerUpdate(swiper) {
                    updateMaterialsProgress(swiper);
                }
            }
        });

        initMaterialsInteractionPause(root);
        updateMaterialsAutoplayMode();
        updateMaterialsProgress(state.materialsSwiper);
    }

    /* =======================================================
       Final Photo Story
       ======================================================= */

    function initStorySwiper() {
        const root = document.querySelector(
            selectors.storySwiper
        );

        if (
            !root ||
            !hasSwiperLibrary() ||
            !mobileMedia.matches ||
            state.storySwiper
        ) {
            return;
        }

        const slides = root.querySelectorAll(".swiper-slide");

        if (slides.length < 2) {
            return;
        }

        state.storySwiper = new window.Swiper(root, {
            slidesPerView: "auto",
            spaceBetween: 0,
            speed: reducedMotionMedia.matches ? 1 : 680,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            grabCursor: true,
            resistanceRatio: 0.68,

            keyboard: {
                enabled: true,
                onlyInViewport: true
            },

            a11y: {
                enabled: true,
                containerMessage:
                    "Bathroom request planning story",
                slideLabelMessage:
                    "{{index}} of {{slidesLength}}"
            }
        });

        refreshAOS();
    }

    function destroyStorySwiper() {
        state.storySwiper = destroySwiper(
            state.storySwiper
        );
    }

    function updateStoryMode() {
        if (mobileMedia.matches) {
            initStorySwiper();
        } else {
            destroyStorySwiper();
        }
    }

    /* =======================================================
       Style Explorer
       ======================================================= */

    function getStyleElements(explorer) {
        return {
            tabs: Array.from(
                explorer.querySelectorAll(selectors.styleTab)
            ),
            media: explorer.querySelector(selectors.styleMedia),
            image: explorer.querySelector(selectors.styleImage),
            title: explorer.querySelector(selectors.styleTitle),
            description: explorer.querySelector(
                selectors.styleDescription
            ),
            materials: explorer.querySelector(
                selectors.styleMaterials
            ),
            caption: explorer.querySelector(
                selectors.styleCaption
            )
        };
    }

    function setActiveStyleTab(tabs, activeTab) {
        tabs.forEach((tab) => {
            const isActive = tab === activeTab;

            tab.classList.toggle("is-active", isActive);
            tab.setAttribute(
                "aria-selected",
                String(isActive)
            );

            tab.setAttribute(
                "tabindex",
                isActive ? "0" : "-1"
            );
        });
    }

    function preloadImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();

            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source;
        });
    }

    function replaceStyleCopy(elements, tab) {
        const {
            title,
            description,
            materials,
            caption
        } = elements;

        if (title) {
            title.textContent = tab.dataset.styleName || "";
        }

        if (description) {
            description.textContent =
                tab.dataset.styleDescription || "";
        }

        if (materials) {
            materials.textContent =
                tab.dataset.styleMaterials || "";
        }

        if (caption) {
            caption.textContent =
                tab.dataset.styleName || "";
        }
    }

    async function activateStyle(explorer, tab) {
        const elements = getStyleElements(explorer);
        const {
            tabs,
            media,
            image
        } = elements;

        if (
            !tab ||
            !tabs.includes(tab) ||
            tab.getAttribute("aria-selected") === "true"
        ) {
            return;
        }

        const imageSource = tab.dataset.styleImage;
        const imageAlt = tab.dataset.styleAlt || "";
        const requestId = ++state.styleRequestId;

        setActiveStyleTab(tabs, tab);

        if (!imageSource || !image) {
            replaceStyleCopy(elements, tab);
            return;
        }

        media?.classList.add("is-changing");

        try {
            await preloadImage(imageSource);
        } catch {
            media?.classList.remove("is-changing");
            return;
        }

        if (requestId !== state.styleRequestId) {
            return;
        }

        window.setTimeout(() => {
            if (requestId !== state.styleRequestId) {
                return;
            }

            image.src = imageSource;
            image.alt = imageAlt;

            replaceStyleCopy(elements, tab);

            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    media?.classList.remove("is-changing");
                });
            });
        }, reducedMotionMedia.matches ? 0 : 160);
    }

    function focusStyleTab(tabs, index) {
        const normalizedIndex =
            (index + tabs.length) % tabs.length;

        tabs[normalizedIndex]?.focus();
    }

    function handleStyleKeyboard(
        event,
        explorer,
        tab,
        tabs
    ) {
        const currentIndex = tabs.indexOf(tab);

        if (event.key === "ArrowDown") {
            event.preventDefault();
            focusStyleTab(tabs, currentIndex + 1);
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            focusStyleTab(tabs, currentIndex - 1);
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            focusStyleTab(tabs, currentIndex + 1);
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            focusStyleTab(tabs, currentIndex - 1);
        }

        if (event.key === "Home") {
            event.preventDefault();
            focusStyleTab(tabs, 0);
        }

        if (event.key === "End") {
            event.preventDefault();
            focusStyleTab(tabs, tabs.length - 1);
        }

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();
            activateStyle(explorer, tab);
        }
    }

    function initStyleExplorer() {
        const explorer = document.querySelector(
            selectors.styleExplorer
        );

        if (
            !explorer ||
            explorer.dataset.styleInitialized === "true"
        ) {
            return;
        }

        const { tabs } = getStyleElements(explorer);

        if (!tabs.length) {
            return;
        }

        explorer.dataset.styleInitialized = "true";

        let activeTab =
            tabs.find(
                (tab) =>
                    tab.getAttribute("aria-selected") === "true"
            ) || tabs[0];

        setActiveStyleTab(tabs, activeTab);

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                activeTab = tab;
                activateStyle(explorer, tab);
            });

            tab.addEventListener("keydown", (event) => {
                handleStyleKeyboard(
                    event,
                    explorer,
                    tab,
                    tabs
                );
            });

            tab.addEventListener("focus", () => {
                if (
                    window.matchMedia(
                        "(hover: hover) and (pointer: fine)"
                    ).matches
                ) {
                    return;
                }

                tab.scrollIntoView({
                    block: "nearest",
                    inline: "nearest"
                });
            });
        });
    }

    /* =======================================================
       Bathroom Hotspots
       ======================================================= */

    function getHotspotRoot() {
        return document.querySelector(selectors.hotspots);
    }

    function getHotspotButton(root, key) {
        return root?.querySelector(
            `${selectors.hotspotButton}[data-hotspot-button="${key}"]`
        );
    }

    function getHotspotPanel(root, key) {
        return root?.querySelector(
            `${selectors.hotspotPanel}[data-hotspot-panel="${key}"]`
        );
    }

    function closeActiveHotspot({
        restoreFocus = false
    } = {}) {
        const root = getHotspotRoot();

        if (!root || !state.activeHotspot) {
            return;
        }

        const key = state.activeHotspot;
        const button = getHotspotButton(root, key);
        const panel = getHotspotPanel(root, key);

        button?.setAttribute("aria-expanded", "false");

        if (panel) {
            panel.classList.remove("is-open");
            panel.hidden = true;
        }

        state.activeHotspot = null;

        if (
            restoreFocus &&
            state.previousHotspotTrigger instanceof HTMLElement
        ) {
            state.previousHotspotTrigger.focus();
        }

        state.previousHotspotTrigger = null;
    }

    function openHotspot(root, key, trigger) {
        const panel = getHotspotPanel(root, key);

        if (!panel || !trigger) {
            return;
        }

        if (state.activeHotspot === key) {
            closeActiveHotspot({
                restoreFocus: false
            });

            return;
        }

        closeActiveHotspot({
            restoreFocus: false
        });

        state.activeHotspot = key;
        state.previousHotspotTrigger = trigger;

        trigger.setAttribute("aria-expanded", "true");

        panel.hidden = false;

        window.requestAnimationFrame(() => {
            panel.classList.add("is-open");
        });
    }

    function initHotspots() {
        const root = getHotspotRoot();

        if (
            !root ||
            root.dataset.hotspotsInitialized === "true"
        ) {
            return;
        }

        const buttons = Array.from(
            root.querySelectorAll(selectors.hotspotButton)
        );

        const panels = Array.from(
            root.querySelectorAll(selectors.hotspotPanel)
        );

        if (!buttons.length || !panels.length) {
            return;
        }

        root.dataset.hotspotsInitialized = "true";

        buttons.forEach((button) => {
            const key = button.dataset.hotspotButton;

            button.setAttribute("aria-expanded", "false");

            button.addEventListener("click", () => {
                openHotspot(root, key, button);
            });
        });

        panels.forEach((panel) => {
            panel.hidden = true;

            const closeButton = panel.querySelector(
                selectors.hotspotClose
            );

            closeButton?.addEventListener("click", () => {
                closeActiveHotspot({
                    restoreFocus: true
                });
            });
        });

        root.addEventListener("click", (event) => {
            if (!state.activeHotspot) {
                return;
            }

            const clickedButton = event.target.closest(
                selectors.hotspotButton
            );

            const clickedPanel = event.target.closest(
                selectors.hotspotPanel
            );

            if (!clickedButton && !clickedPanel) {
                closeActiveHotspot({
                    restoreFocus: false
                });
            }
        });

        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Escape" &&
                state.activeHotspot
            ) {
                event.preventDefault();

                closeActiveHotspot({
                    restoreFocus: true
                });
            }
        });
    }

    /* =======================================================
       Responsive and Motion Changes
       ======================================================= */

    function handleMobileBreakpointChange() {
        updateServiceMosaicMode();
        updateStoryMode();
        updateMaterialsAutoplayMode();

        if (mobileMedia.matches) {
            closeActiveHotspot({
                restoreFocus: false
            });
        }

        refreshAOS();
    }

    function handleReducedMotionChange() {
        updateMaterialsAutoplayMode();

        if (state.materialsSwiper) {
            state.materialsSwiper.params.speed =
                reducedMotionMedia.matches ? 1 : 680;
        }

        if (state.serviceSwiper) {
            state.serviceSwiper.params.speed =
                reducedMotionMedia.matches ? 1 : 620;
        }

        if (state.storySwiper) {
            state.storySwiper.params.speed =
                reducedMotionMedia.matches ? 1 : 680;
        }
    }

    /* =======================================================
       Page Initialization
       ======================================================= */

    function initHomePage() {
        if (
            state.initialized ||
            !isHomePage()
        ) {
            return;
        }

        state.initialized = true;

        initStyleExplorer();
        initHotspots();
        initMaterialsSwiper();

        updateServiceMosaicMode();
        updateStoryMode();
        updateMaterialsAutoplayMode();

        addMediaListener(
            mobileMedia,
            handleMobileBreakpointChange
        );

        addMediaListener(
            reducedMotionMedia,
            handleReducedMotionChange
        );

        refreshAOS();

        document.dispatchEvent(
            new CustomEvent("bathnice:home-ready")
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initHomePage,
            {
                once: true
            }
        );
    } else {
        initHomePage();
    }

    window.addEventListener(
        "load",
        () => {
            if (!isHomePage()) {
                return;
            }

            state.materialsSwiper?.update();
            state.serviceSwiper?.update();
            state.storySwiper?.update();

            updateMaterialsProgress(
                state.materialsSwiper
            );

            refreshAOS();
        },
        {
            once: true
        }
    );
})();