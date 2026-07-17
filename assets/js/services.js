"use strict";

/**
 * BathNice shared service-page interactions.
 *
 * Used by all six service pages.
 *
 * Responsibilities:
 * - accessible planning-topic switchers;
 * - keyboard navigation for switcher tabs;
 * - local image preloading and crossfade transitions;
 * - active-state tracking for the sticky section navigation;
 * - request-path progress tracking;
 * - one Swiper initialization per related-services slider;
 * - safe reinitialization after bfcache restoration;
 * - no duplicate AOS initialization.
 */

(() => {
    const PAGE_SELECTOR = ".service-page";

    const selectors = {
        header: "[data-site-header]",

        switcher: "[data-service-switcher]",
        switcherTabs: "[data-service-switcher-tab]",
        switcherMedia: "[data-service-switcher-media]",
        switcherImage: "[data-service-switcher-image]",
        switcherCaption: "[data-service-switcher-caption]",
        switcherLabel: "[data-service-switcher-label]",
        switcherTitle: "[data-service-switcher-title]",
        switcherDescription: "[data-service-switcher-description]",
        switcherDetail: "[data-service-switcher-detail]",

        serviceAnchor: "[data-service-anchor]",

        path: "[data-service-path]",
        pathStep: "[data-service-path-step]",
        pathProgress: "[data-service-path-progress]",
        pathCurrent: "[data-service-path-current]",

        relatedSwiper: "[data-service-related-swiper]",
        relatedPrevious: ".service-related__prev",
        relatedNext: ".service-related__next",
        relatedProgress: "[data-service-related-progress]",
        relatedCurrent: "[data-service-related-current]"
    };

    const state = {
        initialized: false,
        switcherCounter: 0,
        observers: [],
        cleanupCallbacks: [],
        swiperInstances: new Set(),
        imagePromises: new Map()
    };

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    /* =======================================================
       General Helpers
       ======================================================= */

    function isServicePage() {
        return Boolean(document.querySelector(PAGE_SELECTOR));
    }

    function clamp(value, minimum, maximum) {
        return Math.min(
            Math.max(value, minimum),
            maximum
        );
    }

    function padNumber(value) {
        return String(value).padStart(2, "0");
    }

    function createUniqueId(prefix) {
        state.switcherCounter += 1;

        return `${prefix}-${state.switcherCounter}`;
    }

    function getReducedMotionPreference() {
        return reducedMotionQuery.matches;
    }

    function getHeaderOffset() {
        const header = document.querySelector(
            selectors.header
        );

        const headerHeight = header
            ? header.getBoundingClientRect().height
            : 0;

        return Math.max(
            88,
            Math.round(headerHeight + 24)
        );
    }

    function getDocumentTop(element) {
        return (
            element.getBoundingClientRect().top +
            window.scrollY
        );
    }

    function createFrameScheduler(callback) {
        let frameId = 0;

        return () => {
            if (frameId) {
                return;
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = 0;
                callback();
            });
        };
    }

    function dispatchServiceEvent(
        target,
        eventName,
        detail = {}
    ) {
        target.dispatchEvent(
            new CustomEvent(eventName, {
                bubbles: true,
                detail
            })
        );
    }

    function safelyReplaceHistoryHash(hash) {
        if (
            !hash ||
            window.location.hash === hash
        ) {
            return;
        }

        try {
            const nextUrl =
                `${window.location.pathname}` +
                `${window.location.search}` +
                `${hash}`;

            window.history.replaceState(
                window.history.state,
                "",
                nextUrl
            );
        } catch {
            /*
             * History replacement is optional.
             * Native anchor navigation still works without it.
             */
        }
    }

    function safelyPushHistoryHash(hash) {
        if (!hash) {
            return;
        }

        try {
            const nextUrl =
                `${window.location.pathname}` +
                `${window.location.search}` +
                `${hash}`;

            window.history.pushState(
                window.history.state,
                "",
                nextUrl
            );
        } catch {
            window.location.hash = hash;
        }
    }

    function scrollToElement(
        element,
        {
            updateHistory = false
        } = {}
    ) {
        if (!element) {
            return;
        }

        const destination = Math.max(
            0,
            getDocumentTop(element) -
            getHeaderOffset()
        );

        window.scrollTo({
            top: destination,
            behavior: getReducedMotionPreference()
                ? "auto"
                : "smooth"
        });

        if (updateHistory && element.id) {
            safelyPushHistoryHash(`#${element.id}`);
        }
    }

    /* =======================================================
       Image Preloading
       ======================================================= */

    function preloadImage(source) {
        if (!source) {
            return Promise.resolve(false);
        }

        if (state.imagePromises.has(source)) {
            return state.imagePromises.get(source);
        }

        const promise = new Promise((resolve) => {
            const image = new Image();

            image.onload = () => {
                resolve(true);
            };

            image.onerror = () => {
                resolve(false);
            };

            image.src = source;

            if (image.complete) {
                resolve(image.naturalWidth > 0);
            }
        });

        state.imagePromises.set(source, promise);

        return promise;
    }

    function preloadSwitcherImages(tabs) {
        tabs.forEach((tab) => {
            const source = tab.dataset.switcherImage;

            if (source) {
                preloadImage(source);
            }
        });
    }

    async function decodeVisibleImage(image) {
        if (
            !image ||
            typeof image.decode !== "function"
        ) {
            return;
        }

        try {
            await image.decode();
        } catch {
            /*
             * A failed decode should not block the interface.
             * The browser can still render the loaded image.
             */
        }
    }

    /* =======================================================
       Planning Topic Switchers
       ======================================================= */

    function getSwitcherData(tab) {
        return {
            name:
                tab.dataset.switcherName ||
                tab.textContent.trim(),

            image:
                tab.dataset.switcherImage || "",

            alt:
                tab.dataset.switcherAlt || "",

            title:
                tab.dataset.switcherTitle || "",

            description:
                tab.dataset.switcherDescription || "",

            detail:
                tab.dataset.switcherDetail || ""
        };
    }

    function setTextContent(element, value) {
        if (!element) {
            return;
        }

        element.textContent = value || "";
    }

    function configureSwitcherAccessibility(
        root,
        tabs,
        panel
    ) {
        const groupId = createUniqueId(
            "service-switcher"
        );

        if (panel) {
            if (!panel.id) {
                panel.id = `${groupId}-panel`;
            }

            panel.setAttribute("role", "tabpanel");
            panel.setAttribute("aria-live", "polite");
            panel.setAttribute("aria-atomic", "true");
        }

        tabs.forEach((tab, index) => {
            if (!tab.id) {
                tab.id = `${groupId}-tab-${index + 1}`;
            }

            tab.setAttribute("role", "tab");

            if (panel?.id) {
                tab.setAttribute(
                    "aria-controls",
                    panel.id
                );
            }
        });

        root.setAttribute(
            "data-switcher-accessible",
            "true"
        );
    }

    function setActiveSwitcherTab(
        tabs,
        activeIndex
    ) {
        tabs.forEach((tab, index) => {
            const active = index === activeIndex;

            tab.classList.toggle(
                "is-active",
                active
            );

            tab.setAttribute(
                "aria-selected",
                String(active)
            );

            tab.tabIndex = active ? 0 : -1;
        });
    }

    function updateSwitcherPanel(
        root,
        tab,
        panel
    ) {
        const data = getSwitcherData(tab);

        setTextContent(
            root.querySelector(selectors.switcherCaption),
            data.name
        );

        setTextContent(
            root.querySelector(selectors.switcherTitle),
            data.title
        );

        setTextContent(
            root.querySelector(
                selectors.switcherDescription
            ),
            data.description
        );

        setTextContent(
            root.querySelector(selectors.switcherDetail),
            data.detail
        );

        if (panel) {
            panel.setAttribute(
                "aria-labelledby",
                tab.id
            );
        }

        return data;
    }

    async function updateSwitcherImage(
        root,
        image,
        data,
        transitionToken,
        getCurrentToken
    ) {
        if (!image || !data.image) {
            return;
        }

        const media = root.querySelector(
            selectors.switcherMedia
        );

        const animate =
            !getReducedMotionPreference() &&
            image.currentSrc !== data.image &&
            image.getAttribute("src") !== data.image;

        root.setAttribute("aria-busy", "true");

        if (animate) {
            media?.classList.add("is-changing");

            await new Promise((resolve) => {
                window.setTimeout(resolve, 170);
            });
        }

        await preloadImage(data.image);

        if (transitionToken !== getCurrentToken()) {
            return;
        }

        image.src = data.image;
        image.alt = data.alt;

        await decodeVisibleImage(image);

        if (transitionToken !== getCurrentToken()) {
            return;
        }

        window.requestAnimationFrame(() => {
            media?.classList.remove("is-changing");
            root.removeAttribute("aria-busy");
        });
    }

    function initServiceSwitcher(root) {
        if (
            root.dataset.serviceSwitcherInitialized ===
            "true"
        ) {
            return;
        }

        const tabs = Array.from(
            root.querySelectorAll(
                selectors.switcherTabs
            )
        );

        const image = root.querySelector(
            selectors.switcherImage
        );

        const panel =
            root.querySelector(
                ".service-decisions__panel"
            ) ||
            root.querySelector('[role="tabpanel"]');

        if (tabs.length === 0) {
            return;
        }

        root.dataset.serviceSwitcherInitialized =
            "true";

        configureSwitcherAccessibility(
            root,
            tabs,
            panel
        );

        preloadSwitcherImages(tabs);

        let activeIndex = Math.max(
            0,
            tabs.findIndex(
                (tab) =>
                    tab.classList.contains("is-active") ||
                    tab.getAttribute("aria-selected") ===
                    "true"
            )
        );

        let transitionToken = 0;

        const getCurrentToken = () =>
            transitionToken;

        const activateTab = (
            nextIndex,
            {
                focus = false,
                animate = true,
                emit = true
            } = {}
        ) => {
            const normalizedIndex =
                ((nextIndex % tabs.length) +
                    tabs.length) %
                tabs.length;

            const nextTab = tabs[normalizedIndex];

            if (!nextTab) {
                return;
            }

            const indexChanged =
                normalizedIndex !== activeIndex;

            activeIndex = normalizedIndex;
            transitionToken += 1;

            const currentToken = transitionToken;

            setActiveSwitcherTab(
                tabs,
                activeIndex
            );

            const data = updateSwitcherPanel(
                root,
                nextTab,
                panel
            );

            if (focus) {
                nextTab.focus({
                    preventScroll: true
                });
            }

            if (
                !animate ||
                getReducedMotionPreference()
            ) {
                if (image && data.image) {
                    image.src = data.image;
                    image.alt = data.alt;
                }

                root.removeAttribute("aria-busy");
            } else {
                updateSwitcherImage(
                    root,
                    image,
                    data,
                    currentToken,
                    getCurrentToken
                );
            }

            if (emit && indexChanged) {
                dispatchServiceEvent(
                    root,
                    "bathnice:service-switcher-change",
                    {
                        index: activeIndex,
                        value: data.name,
                        image: data.image
                    }
                );
            }
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => {
                activateTab(index);
            });

            tab.addEventListener(
                "keydown",
                (event) => {
                    let nextIndex = null;

                    switch (event.key) {
                        case "ArrowRight":
                        case "ArrowDown":
                            nextIndex = activeIndex + 1;
                            break;

                        case "ArrowLeft":
                        case "ArrowUp":
                            nextIndex = activeIndex - 1;
                            break;

                        case "Home":
                            nextIndex = 0;
                            break;

                        case "End":
                            nextIndex = tabs.length - 1;
                            break;

                        case "Enter":
                        case " ":
                            nextIndex = index;
                            break;

                        default:
                            break;
                    }

                    if (nextIndex === null) {
                        return;
                    }

                    event.preventDefault();

                    activateTab(nextIndex, {
                        focus: true
                    });
                }
            );
        });

        activateTab(activeIndex, {
            animate: false,
            emit: false
        });
    }

    function initServiceSwitchers() {
        document
            .querySelectorAll(selectors.switcher)
            .forEach(initServiceSwitcher);
    }

    /* =======================================================
       Sticky Page Navigation
       ======================================================= */

    function initServiceSectionNavigation() {
        const links = Array.from(
            document.querySelectorAll(
                selectors.serviceAnchor
            )
        );

        if (links.length === 0) {
            return;
        }

        const entries = links
            .map((link) => {
                const href = link.getAttribute("href");

                if (
                    !href ||
                    !href.startsWith("#")
                ) {
                    return null;
                }

                const section = document.getElementById(
                    href.slice(1)
                );

                if (!section) {
                    return null;
                }

                return {
                    link,
                    section,
                    hash: href
                };
            })
            .filter(Boolean);

        if (entries.length === 0) {
            return;
        }

        let activeHash = "";

        const setActiveEntry = (
            entry,
            {
                updateUrl = false
            } = {}
        ) => {
            if (
                !entry ||
                activeHash === entry.hash
            ) {
                return;
            }

            activeHash = entry.hash;

            entries.forEach((item) => {
                const active = item === entry;

                item.link.classList.toggle(
                    "is-active",
                    active
                );

                if (active) {
                    item.link.setAttribute(
                        "aria-current",
                        "location"
                    );
                } else {
                    item.link.removeAttribute(
                        "aria-current"
                    );
                }
            });

            if (updateUrl) {
                safelyReplaceHistoryHash(entry.hash);
            }

            dispatchServiceEvent(
                entry.link,
                "bathnice:service-section-change",
                {
                    id: entry.section.id,
                    hash: entry.hash
                }
            );
        };

        const detectActiveSection = () => {
            const marker =
                window.scrollY +
                getHeaderOffset() +
                window.innerHeight * 0.22;

            let activeEntry = entries[0];

            entries.forEach((entry) => {
                if (
                    getDocumentTop(entry.section) <=
                    marker
                ) {
                    activeEntry = entry;
                }
            });

            const lastEntry =
                entries[entries.length - 1];

            const nearDocumentEnd =
                window.innerHeight +
                window.scrollY >=
                document.documentElement.scrollHeight -
                8;

            if (nearDocumentEnd) {
                activeEntry = lastEntry;
            }

            setActiveEntry(activeEntry);
        };

        const scheduleDetection =
            createFrameScheduler(
                detectActiveSection
            );

        entries.forEach((entry) => {
            entry.link.addEventListener(
                "click",
                (event) => {
                    if (
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                    ) {
                        return;
                    }

                    event.preventDefault();

                    setActiveEntry(entry);

                    scrollToElement(entry.section, {
                        updateHistory: true
                    });
                }
            );
        });

        window.addEventListener(
            "scroll",
            scheduleDetection,
            {
                passive: true
            }
        );

        window.addEventListener(
            "resize",
            scheduleDetection,
            {
                passive: true
            }
        );

        state.cleanupCallbacks.push(() => {
            window.removeEventListener(
                "scroll",
                scheduleDetection
            );

            window.removeEventListener(
                "resize",
                scheduleDetection
            );
        });

        if (window.location.hash) {
            const hashEntry = entries.find(
                (entry) =>
                    entry.hash === window.location.hash
            );

            if (hashEntry) {
                setActiveEntry(hashEntry);

                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        scrollToElement(hashEntry.section);
                    });
                });
            } else {
                detectActiveSection();
            }
        } else {
            detectActiveSection();
        }
    }

    /* =======================================================
       Request Path Progress
       ======================================================= */

    function initServicePath(path) {
        if (
            path.dataset.servicePathInitialized ===
            "true"
        ) {
            return;
        }

        const steps = Array.from(
            path.querySelectorAll(
                selectors.pathStep
            )
        );

        const progress = path.querySelector(
            selectors.pathProgress
        );

        const current = path.querySelector(
            selectors.pathCurrent
        );

        if (steps.length === 0) {
            return;
        }

        path.dataset.servicePathInitialized =
            "true";

        let activeIndex = -1;

        const updatePath = () => {
            const viewportMarker =
                window.innerHeight * 0.45;

            let nearestIndex = 0;
            let nearestDistance =
                Number.POSITIVE_INFINITY;

            steps.forEach((step, index) => {
                const rectangle =
                    step.getBoundingClientRect();

                const stepMarker =
                    rectangle.top +
                    Math.min(
                        rectangle.height * 0.28,
                        180
                    );

                const distance = Math.abs(
                    stepMarker - viewportMarker
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            if (nearestIndex === activeIndex) {
                return;
            }

            activeIndex = nearestIndex;

            steps.forEach((step, index) => {
                const active = index === activeIndex;
                const completed = index < activeIndex;

                step.classList.toggle(
                    "is-current",
                    active
                );

                step.classList.toggle(
                    "is-complete",
                    completed
                );

                if (active) {
                    step.setAttribute(
                        "aria-current",
                        "step"
                    );
                } else {
                    step.removeAttribute(
                        "aria-current"
                    );
                }
            });

            if (current) {
                current.textContent = padNumber(
                    activeIndex + 1
                );
            }

            if (progress) {
                const percentage =
                    ((activeIndex + 1) /
                        steps.length) *
                    100;

                progress.style.width =
                    `${percentage}%`;
            }

            path.style.setProperty(
                "--service-path-progress",
                String(
                    (activeIndex + 1) /
                    steps.length
                )
            );

            dispatchServiceEvent(
                path,
                "bathnice:service-path-change",
                {
                    index: activeIndex,
                    step:
                        steps[activeIndex]?.dataset
                            .servicePathStep ||
                        String(activeIndex + 1),
                    total: steps.length
                }
            );
        };

        const scheduleUpdate =
            createFrameScheduler(updatePath);

        window.addEventListener(
            "scroll",
            scheduleUpdate,
            {
                passive: true
            }
        );

        window.addEventListener(
            "resize",
            scheduleUpdate,
            {
                passive: true
            }
        );

        state.cleanupCallbacks.push(() => {
            window.removeEventListener(
                "scroll",
                scheduleUpdate
            );

            window.removeEventListener(
                "resize",
                scheduleUpdate
            );
        });

        updatePath();
    }

    function initServicePaths() {
        document
            .querySelectorAll(selectors.path)
            .forEach(initServicePath);
    }

    /* =======================================================
       Related Services Swiper
       ======================================================= */

    function updateRelatedSliderUi(
        swiperRoot,
        swiper
    ) {
        const section = swiperRoot.closest(
            ".service-related"
        );

        const current = section?.querySelector(
            selectors.relatedCurrent
        );

        const progress = section?.querySelector(
            selectors.relatedProgress
        );

        const slideCount =
            swiper.slides?.length || 0;

        const currentIndex = clamp(
            (swiper.activeIndex || 0) + 1,
            1,
            Math.max(slideCount, 1)
        );

        if (current) {
            current.textContent =
                padNumber(currentIndex);
        }

        if (progress) {
            const minimumProgress =
                slideCount > 0
                    ? 1 / slideCount
                    : 1;

            const swiperProgress =
                Number.isFinite(swiper.progress)
                    ? swiper.progress
                    : 0;

            const visibleProgress = clamp(
                Math.max(
                    minimumProgress,
                    swiperProgress
                ),
                0,
                1
            );

            progress.style.transformOrigin =
                "left center";

            progress.style.transform =
                `scaleX(${visibleProgress})`;
        }
    }

    function setStaticSliderState(swiperRoot) {
        const section = swiperRoot.closest(
            ".service-related"
        );

        const progress = section?.querySelector(
            selectors.relatedProgress
        );

        const current = section?.querySelector(
            selectors.relatedCurrent
        );

        swiperRoot.classList.add(
            "is-static"
        );

        if (current) {
            current.textContent = "01";
        }

        if (progress) {
            progress.style.transformOrigin =
                "left center";

            progress.style.transform =
                "scaleX(1)";
        }
    }

    function initRelatedServicesSwiper(
        swiperRoot
    ) {
        if (
            swiperRoot.dataset.swiperInitialized ===
            "true"
        ) {
            return;
        }

        const section = swiperRoot.closest(
            ".service-related"
        );

        const previousButton =
            section?.querySelector(
                selectors.relatedPrevious
            );

        const nextButton =
            section?.querySelector(
                selectors.relatedNext
            );

        const slideCount =
            swiperRoot.querySelectorAll(
                ".swiper-slide"
            ).length;

        if (slideCount === 0) {
            return;
        }

        swiperRoot.dataset.swiperInitialized =
            "true";

        if (
            typeof window.Swiper !== "function"
        ) {
            setStaticSliderState(swiperRoot);
            return;
        }

        try {
            const swiper = new window.Swiper(
                swiperRoot,
                {
                    slidesPerView: 1.06,
                    spaceBetween: 16,
                    speed: getReducedMotionPreference()
                        ? 0
                        : 700,
                    grabCursor: true,
                    watchOverflow: true,
                    watchSlidesProgress: true,
                    resistanceRatio: 0.72,
                    roundLengths: true,
                    observer: true,
                    observeParents: true,
                    resizeObserver: true,
                    keyboard: {
                        enabled: true,
                        onlyInViewport: true,
                        pageUpDown: false
                    },
                    a11y: {
                        enabled: true,
                        prevSlideMessage:
                            "Show previous related service",
                        nextSlideMessage:
                            "Show next related service",
                        firstSlideMessage:
                            "This is the first related service",
                        lastSlideMessage:
                            "This is the last related service",
                        paginationBulletMessage:
                            "Go to related service {{index}}"
                    },
                    navigation: {
                        prevEl: previousButton || null,
                        nextEl: nextButton || null
                    },
                    breakpoints: {
                        540: {
                            slidesPerView: 1.35,
                            spaceBetween: 18
                        },
                        680: {
                            slidesPerView: 1.7,
                            spaceBetween: 20
                        },
                        820: {
                            slidesPerView: 2.15,
                            spaceBetween: 22
                        },
                        1024: {
                            slidesPerView: 2.5,
                            spaceBetween: 24
                        },
                        1180: {
                            slidesPerView: 3,
                            spaceBetween: 26
                        },
                        1560: {
                            slidesPerView: 3.25,
                            spaceBetween: 28
                        }
                    },
                    on: {
                        init(instance) {
                            updateRelatedSliderUi(
                                swiperRoot,
                                instance
                            );

                            dispatchServiceEvent(
                                swiperRoot,
                                "bathnice:related-slider-ready",
                                {
                                    total:
                                        instance.slides?.length ||
                                        slideCount
                                }
                            );
                        },

                        slideChange(instance) {
                            updateRelatedSliderUi(
                                swiperRoot,
                                instance
                            );
                        },

                        progress(instance) {
                            updateRelatedSliderUi(
                                swiperRoot,
                                instance
                            );
                        },

                        resize(instance) {
                            updateRelatedSliderUi(
                                swiperRoot,
                                instance
                            );
                        },

                        breakpoint(instance) {
                            updateRelatedSliderUi(
                                swiperRoot,
                                instance
                            );
                        }
                    }
                }
            );

            state.swiperInstances.add(swiper);
        } catch (error) {
            swiperRoot.dataset.swiperInitialized =
                "error";

            setStaticSliderState(swiperRoot);

            console.error(
                "BathNice related-services slider could not be initialized.",
                error
            );
        }
    }

    function initRelatedServicesSliders() {
        document
            .querySelectorAll(
                selectors.relatedSwiper
            )
            .forEach(
                initRelatedServicesSwiper
            );
    }

    /* =======================================================
       URL Service Validation
       ======================================================= */

    function ensureServiceRequestLinks() {
        const page =
            document.querySelector(PAGE_SELECTOR);

        if (!page) {
            return;
        }

        const servicePage =
            page.dataset.servicePage;

        if (!servicePage) {
            return;
        }

        const configuredServices =
            window.BATHNICE_CONFIG?.services;

        if (!Array.isArray(configuredServices)) {
            return;
        }

        const matchingService =
            configuredServices.find((service) => {
                const candidates = [
                    service?.slug,
                    service?.id,
                    service?.url
                        ?.replace(".html", "")
                ]
                    .filter(Boolean)
                    .map((value) =>
                        String(value).toLowerCase()
                    );

                return candidates.includes(
                    servicePage.toLowerCase()
                );
            });

        if (!matchingService) {
            return;
        }

        const requestValue =
            matchingService.formValue ||
            matchingService.name;

        if (!requestValue) {
            return;
        }

        const requestHref =
            `contact.html?service=` +
            encodeURIComponent(requestValue);

        document
            .querySelectorAll(
                'a[href^="contact.html?service="]'
            )
            .forEach((link) => {
                link.href = requestHref;
            });
    }

    /* =======================================================
       Reduced Motion Changes
       ======================================================= */

    function handleMotionPreferenceChange() {
        state.swiperInstances.forEach(
            (swiper) => {
                if (
                    !swiper ||
                    swiper.destroyed
                ) {
                    return;
                }

                swiper.params.speed =
                    getReducedMotionPreference()
                        ? 0
                        : 700;

                swiper.update();
            }
        );
    }

    function initMotionPreferenceListener() {
        if (
            typeof reducedMotionQuery
                .addEventListener === "function"
        ) {
            reducedMotionQuery.addEventListener(
                "change",
                handleMotionPreferenceChange
            );

            state.cleanupCallbacks.push(() => {
                reducedMotionQuery.removeEventListener(
                    "change",
                    handleMotionPreferenceChange
                );
            });

            return;
        }

        if (
            typeof reducedMotionQuery
                .addListener === "function"
        ) {
            reducedMotionQuery.addListener(
                handleMotionPreferenceChange
            );

            state.cleanupCallbacks.push(() => {
                reducedMotionQuery.removeListener(
                    handleMotionPreferenceChange
                );
            });
        }
    }

    /* =======================================================
       Initialization
       ======================================================= */

    function refreshServiceComponents() {
        ensureServiceRequestLinks();
        initServiceSwitchers();
        initServicePaths();
        initRelatedServicesSliders();

        state.swiperInstances.forEach(
            (swiper) => {
                if (
                    !swiper ||
                    swiper.destroyed
                ) {
                    return;
                }

                swiper.update();

                updateRelatedSliderUi(
                    swiper.el,
                    swiper
                );
            }
        );
    }

    function initServicePage() {
        if (
            state.initialized ||
            !isServicePage()
        ) {
            return;
        }

        state.initialized = true;

        ensureServiceRequestLinks();
        initServiceSwitchers();
        initServiceSectionNavigation();
        initServicePaths();
        initRelatedServicesSliders();
        initMotionPreferenceListener();

        document.dispatchEvent(
            new CustomEvent(
                "bathnice:services-ready"
            )
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initServicePage,
            {
                once: true
            }
        );
    } else {
        initServicePage();
    }

    window.addEventListener(
        "pageshow",
        (event) => {
            if (!isServicePage()) {
                return;
            }

            if (!state.initialized) {
                initServicePage();
                return;
            }

            if (event.persisted) {
                window.requestAnimationFrame(() => {
                    refreshServiceComponents();
                });
            }
        }
    );

    window.BathNiceServices = Object.freeze({
        refresh: refreshServiceComponents,

        getRelatedSliders() {
            return Array.from(
                state.swiperInstances
            );
        },

        scrollToSection(sectionId) {
            const normalizedId = String(
                sectionId || ""
            ).replace(/^#/, "");

            const section =
                document.getElementById(
                    normalizedId
                );

            if (!section) {
                return false;
            }

            scrollToElement(section, {
                updateHistory: true
            });

            return true;
        }
    });
})();