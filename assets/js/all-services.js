"use strict";

/**
 * BathNice All Services page interactions.
 *
 * Responsibilities:
 * - accessible vanity-planning image switcher;
 * - project-priority Swiper;
 * - slider progress and current-slide counter;
 * - desktop autoplay with interaction pause;
 * - reduced-motion and responsive behavior;
 * - AOS refresh after dynamic content updates.
 */

(() => {
    const state = {
        initialized: false,
        vanityRequestId: 0,
        prioritySwiper: null
    };

    const selectors = {
        page: ".all-services-page",

        vanityRoot: "[data-vanity-switcher]",
        vanityTab: "[data-vanity-tab]",
        vanityMedia: "[data-vanity-media]",
        vanityImage: "[data-vanity-image]",
        vanityLabel: "[data-vanity-label]",
        vanityTitle: "[data-vanity-title]",
        vanityDescription: "[data-vanity-description]",
        vanityDetails: "[data-vanity-details]",

        prioritySwiper: "[data-services-priority-swiper]",
        priorityPrevious: ".services-priorities__prev",
        priorityNext: ".services-priorities__next",
        priorityProgress: "[data-services-priority-progress]",
        priorityCurrent: "[data-services-priority-current]"
    };

    const mobileMedia = window.matchMedia("(max-width: 768px)");

    const reducedMotionMedia = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function isAllServicesPage() {
        return Boolean(document.querySelector(selectors.page));
    }

    function hasSwiperLibrary() {
        return typeof window.Swiper === "function";
    }

    function addMediaListener(mediaQuery, handler) {
        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", handler);
            return;
        }

        if (typeof mediaQuery.addListener === "function") {
            mediaQuery.addListener(handler);
        }
    }

    function preloadImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();

            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source;
        });
    }

    /* =======================================================
       Vanity Switcher
       ======================================================= */

    function getVanityElements(root) {
        return {
            tabs: Array.from(
                root.querySelectorAll(selectors.vanityTab)
            ),
            media: root.querySelector(selectors.vanityMedia),
            image: root.querySelector(selectors.vanityImage),
            label: root.querySelector(selectors.vanityLabel),
            title: root.querySelector(selectors.vanityTitle),
            description: root.querySelector(
                selectors.vanityDescription
            ),
            details: root.querySelector(selectors.vanityDetails)
        };
    }

    function setVanityTabState(tabs, activeTab) {
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

    function replaceVanityContent(elements, tab) {
        if (elements.label) {
            elements.label.textContent =
                tab.dataset.vanityName || "";
        }

        if (elements.title) {
            elements.title.textContent =
                tab.dataset.vanityTitle || "";
        }

        if (elements.description) {
            elements.description.textContent =
                tab.dataset.vanityDescription || "";
        }

        if (elements.details) {
            elements.details.textContent =
                tab.dataset.vanityDetails || "";
        }
    }

    async function activateVanityTab(root, tab) {
        const elements = getVanityElements(root);
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

        const source = tab.dataset.vanityImage;
        const alt = tab.dataset.vanityAlt || "";
        const requestId = ++state.vanityRequestId;

        setVanityTabState(tabs, tab);

        if (!source || !image) {
            replaceVanityContent(elements, tab);
            return;
        }

        media?.classList.add("is-changing");

        try {
            await preloadImage(source);
        } catch {
            media?.classList.remove("is-changing");
            return;
        }

        if (requestId !== state.vanityRequestId) {
            return;
        }

        const replacementDelay =
            reducedMotionMedia.matches ? 0 : 150;

        window.setTimeout(() => {
            if (requestId !== state.vanityRequestId) {
                return;
            }

            image.src = source;
            image.alt = alt;

            replaceVanityContent(elements, tab);

            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    media?.classList.remove("is-changing");
                });
            });
        }, replacementDelay);
    }

    function focusVanityTab(tabs, index) {
        if (!tabs.length) {
            return;
        }

        const normalizedIndex =
            (index + tabs.length) % tabs.length;

        const target = tabs[normalizedIndex];

        target?.focus();

        if (mobileMedia.matches) {
            target?.scrollIntoView({
                block: "nearest",
                inline: "center",
                behavior: reducedMotionMedia.matches
                    ? "auto"
                    : "smooth"
            });
        }
    }

    function handleVanityKeyboard(
        event,
        root,
        tab,
        tabs
    ) {
        const currentIndex = tabs.indexOf(tab);

        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                event.preventDefault();
                focusVanityTab(tabs, currentIndex + 1);
                break;

            case "ArrowLeft":
            case "ArrowUp":
                event.preventDefault();
                focusVanityTab(tabs, currentIndex - 1);
                break;

            case "Home":
                event.preventDefault();
                focusVanityTab(tabs, 0);
                break;

            case "End":
                event.preventDefault();
                focusVanityTab(tabs, tabs.length - 1);
                break;

            case "Enter":
            case " ":
                event.preventDefault();
                activateVanityTab(root, tab);
                break;

            default:
                break;
        }
    }

    function initVanitySwitcher() {
        const root = document.querySelector(
            selectors.vanityRoot
        );

        if (
            !root ||
            root.dataset.vanityInitialized === "true"
        ) {
            return;
        }

        const { tabs } = getVanityElements(root);

        if (!tabs.length) {
            return;
        }

        root.dataset.vanityInitialized = "true";

        const initiallyActive =
            tabs.find(
                (tab) =>
                    tab.getAttribute("aria-selected") === "true"
            ) || tabs[0];

        setVanityTabState(tabs, initiallyActive);

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                activateVanityTab(root, tab);
            });

            tab.addEventListener("keydown", (event) => {
                handleVanityKeyboard(
                    event,
                    root,
                    tab,
                    tabs
                );
            });

            tab.addEventListener("focus", () => {
                if (!mobileMedia.matches) {
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
       Priority Slider
       ======================================================= */

    function formatSlideNumber(number) {
        return String(number).padStart(2, "0");
    }

    function getPrioritySlideCount(swiper) {
        if (!swiper?.slides) {
            return 0;
        }

        return swiper.slides.length;
    }

    function getPriorityCurrentIndex(swiper) {
        if (!swiper) {
            return 1;
        }

        const slideCount = getPrioritySlideCount(swiper);

        if (!slideCount) {
            return 1;
        }

        return Math.min(
            Math.max(swiper.activeIndex + 1, 1),
            slideCount
        );
    }

    function updatePriorityProgress(swiper) {
        if (!swiper) {
            return;
        }

        const progress = document.querySelector(
            selectors.priorityProgress
        );

        const current = document.querySelector(
            selectors.priorityCurrent
        );

        const total = getPrioritySlideCount(swiper);
        const currentIndex = getPriorityCurrentIndex(swiper);

        if (progress && total) {
            const percentage =
                (currentIndex / total) * 100;

            progress.style.width = `${percentage}%`;
        }

        if (current) {
            current.textContent =
                formatSlideNumber(currentIndex);
        }
    }

    function shouldAutoplayPrioritySlider() {
        return (
            !mobileMedia.matches &&
            !reducedMotionMedia.matches
        );
    }

    function stopPriorityAutoplay() {
        const autoplay = state.prioritySwiper?.autoplay;

        if (
            autoplay &&
            typeof autoplay.stop === "function"
        ) {
            autoplay.stop();
        }
    }

    function startPriorityAutoplay() {
        if (!shouldAutoplayPrioritySlider()) {
            return;
        }

        const autoplay = state.prioritySwiper?.autoplay;

        if (
            autoplay &&
            typeof autoplay.start === "function"
        ) {
            autoplay.start();
        }
    }

    function updatePriorityAutoplayMode() {
        if (!state.prioritySwiper) {
            return;
        }

        if (shouldAutoplayPrioritySlider()) {
            startPriorityAutoplay();
        } else {
            stopPriorityAutoplay();
        }
    }

    function initPriorityInteractionPause(root) {
        if (
            !root ||
            root.dataset.priorityPauseInitialized === "true"
        ) {
            return;
        }

        root.dataset.priorityPauseInitialized = "true";

        root.addEventListener("pointerenter", () => {
            stopPriorityAutoplay();
        });

        root.addEventListener("pointerleave", () => {
            startPriorityAutoplay();
        });

        root.addEventListener("focusin", () => {
            stopPriorityAutoplay();
        });

        root.addEventListener("focusout", (event) => {
            if (!root.contains(event.relatedTarget)) {
                startPriorityAutoplay();
            }
        });

        root.addEventListener(
            "touchstart",
            () => {
                stopPriorityAutoplay();
            },
            {
                passive: true
            }
        );

        root.addEventListener(
            "touchend",
            () => {
                window.setTimeout(() => {
                    startPriorityAutoplay();
                }, 1800);
            },
            {
                passive: true
            }
        );
    }

    function initPrioritySwiper() {
        const root = document.querySelector(
            selectors.prioritySwiper
        );

        if (
            !root ||
            !hasSwiperLibrary() ||
            state.prioritySwiper
        ) {
            return;
        }

        const slides = root.querySelectorAll(".swiper-slide");

        if (slides.length < 2) {
            return;
        }

        const autoplayOptions =
            shouldAutoplayPrioritySlider()
                ? {
                    delay: 4400,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                }
                : false;

        state.prioritySwiper = new window.Swiper(root, {
            slidesPerView: "auto",
            spaceBetween: 18,
            speed: reducedMotionMedia.matches ? 1 : 680,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            grabCursor: true,
            resistanceRatio: 0.7,
            autoplay: autoplayOptions,

            navigation: {
                previousEl: selectors.priorityPrevious,
                nextEl: selectors.priorityNext
            },

            keyboard: {
                enabled: true,
                onlyInViewport: true
            },

            a11y: {
                enabled: true,
                containerMessage:
                    "Bathroom project priorities",
                previousSlideMessage:
                    "Show previous bathroom priority",
                nextSlideMessage:
                    "Show next bathroom priority",
                slideLabelMessage:
                    "{{index}} of {{slidesLength}}"
            },

            on: {
                init(swiper) {
                    updatePriorityProgress(swiper);
                },

                slideChange(swiper) {
                    updatePriorityProgress(swiper);
                },

                resize(swiper) {
                    updatePriorityProgress(swiper);
                },

                observerUpdate(swiper) {
                    updatePriorityProgress(swiper);
                },

                reachBeginning(swiper) {
                    updatePriorityProgress(swiper);
                },

                reachEnd(swiper) {
                    updatePriorityProgress(swiper);
                }
            }
        });

        initPriorityInteractionPause(root);
        updatePriorityAutoplayMode();
        updatePriorityProgress(state.prioritySwiper);
    }

    /* =======================================================
       Responsive and Motion Changes
       ======================================================= */

    function handleViewportChange() {
        updatePriorityAutoplayMode();

        if (state.prioritySwiper) {
            state.prioritySwiper.update();
            updatePriorityProgress(state.prioritySwiper);
        }

    }

    function handleReducedMotionChange() {
        updatePriorityAutoplayMode();

        if (state.prioritySwiper) {
            state.prioritySwiper.params.speed =
                reducedMotionMedia.matches ? 1 : 680;
        }
    }

    /* =======================================================
       Page Initialization
       ======================================================= */

    function initAllServicesPage() {
        if (
            state.initialized ||
            !isAllServicesPage()
        ) {
            return;
        }

        state.initialized = true;

        initVanitySwitcher();
        initPrioritySwiper();

        addMediaListener(
            mobileMedia,
            handleViewportChange
        );

        addMediaListener(
            reducedMotionMedia,
            handleReducedMotionChange
        );


        document.dispatchEvent(
            new CustomEvent("bathnice:all-services-ready")
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initAllServicesPage,
            {
                once: true
            }
        );
    } else {
        initAllServicesPage();
    }

    window.addEventListener(
        "load",
        () => {
            if (!isAllServicesPage()) {
                return;
            }

            state.prioritySwiper?.update();
            updatePriorityProgress(state.prioritySwiper);
        },
        {
            once: true
        }
    );
})();
