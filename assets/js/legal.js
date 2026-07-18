"use strict";

/**
 * BathNice shared legal-page interactions.
 *
 * Used by:
 * - privacy-policy.html
 * - terms-of-service.html
 * - cookie-policy.html
 *
 * Responsibilities:
 * - smooth navigation between legal-document sections;
 * - active state for the legal page navigation;
 * - sticky navigation support without applying transforms;
 * - correct header offset for anchor navigation;
 * - hash-link support on initial load and browser history changes;
 * - reading progress calculation;
 * - keeping the active link visible inside a scrollable desktop menu;
 * - safe restoration after browser back-forward cache;
 * - no AOS or global component reinitialization.
 */

(() => {
    const PAGE_SELECTOR = ".legal-page";

    const selectors = {
        page: PAGE_SELECTOR,
        header: "[data-site-header]",
        navigation: ".legal-document__nav",
        navigationLink: "[data-legal-anchor]",
        legalSection: ".legal-section[id]",
        legalContent: ".legal-document__content"
    };

    const state = {
        initialized: false,
        activeSectionId: "",
        links: [],
        sections: [],
        linkMap: new Map(),
        cleanupCallbacks: [],
        resizeObserver: null,
        mutationObserver: null,
        scrollFrame: 0,
        hashFrame: 0
    };

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    /* =======================================================
       General Helpers
       ======================================================= */

    function isLegalPage() {
        return Boolean(
            document.querySelector(selectors.page)
        );
    }

    function clamp(value, minimum, maximum) {
        return Math.min(
            Math.max(value, minimum),
            maximum
        );
    }

    function getHeaderHeight() {
        const header = document.querySelector(
            selectors.header
        );

        if (!header) {
            return 0;
        }

        return Math.max(
            0,
            header.getBoundingClientRect().height
        );
    }

    function getAnchorOffset() {
        return Math.max(
            88,
            Math.round(getHeaderHeight() + 24)
        );
    }

    function getDocumentTop(element) {
        return (
            element.getBoundingClientRect().top +
            window.scrollY
        );
    }

    function getDocumentHeight() {
        return Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
        );
    }

    function normalizeHash(value) {
        if (!value) {
            return "";
        }

        const hash = String(value).trim();

        return hash.startsWith("#")
            ? hash
            : `#${hash}`;
    }

    function getSectionFromHash(hash) {
        const normalizedHash =
            normalizeHash(hash);

        if (!normalizedHash) {
            return null;
        }

        let decodedId = normalizedHash.slice(1);

        try {
            decodedId =
                decodeURIComponent(decodedId);
        } catch {
            /*
             * Keep the original value when the hash is not
             * valid URI-encoded text.
             */
        }

        return document.getElementById(decodedId);
    }

    function isModifiedClick(event) {
        return Boolean(
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        );
    }

    function scheduleScrollUpdate() {
        if (state.scrollFrame) {
            return;
        }

        state.scrollFrame =
            window.requestAnimationFrame(() => {
                state.scrollFrame = 0;
                updateLegalPageState();
            });
    }

    function scheduleHashNavigation(
        hash,
        options = {}
    ) {
        if (state.hashFrame) {
            window.cancelAnimationFrame(
                state.hashFrame
            );
        }

        state.hashFrame =
            window.requestAnimationFrame(() => {
                state.hashFrame =
                    window.requestAnimationFrame(() => {
                        state.hashFrame = 0;

                        navigateToHash(hash, options);
                    });
            });
    }

    function dispatchLegalEvent(
        eventName,
        detail = {}
    ) {
        document.dispatchEvent(
            new CustomEvent(eventName, {
                detail
            })
        );
    }

    function requestGlobalLayoutRefresh() {
        window.BathNiceUI?.refreshLayout?.();
    }

    /* =======================================================
       Browser History
       ======================================================= */

    function replaceHash(hash) {
        const normalizedHash =
            normalizeHash(hash);

        if (
            !normalizedHash ||
            window.location.hash ===
            normalizedHash
        ) {
            return;
        }

        try {
            const nextUrl =
                `${window.location.pathname}` +
                `${window.location.search}` +
                normalizedHash;

            window.history.replaceState(
                window.history.state,
                "",
                nextUrl
            );
        } catch {
            /*
             * Scrollspy URL updates are optional.
             * The page remains functional without them.
             */
        }
    }

    function pushHash(hash) {
        const normalizedHash =
            normalizeHash(hash);

        if (!normalizedHash) {
            return;
        }

        if (
            window.location.hash ===
            normalizedHash
        ) {
            replaceHash(normalizedHash);
            return;
        }

        try {
            const nextUrl =
                `${window.location.pathname}` +
                `${window.location.search}` +
                normalizedHash;

            window.history.pushState(
                window.history.state,
                "",
                nextUrl
            );
        } catch {
            window.location.hash =
                normalizedHash;
        }
    }

    /* =======================================================
       Section and Link Collection
       ======================================================= */

    function collectLegalElements() {
        state.links = Array.from(
            document.querySelectorAll(
                selectors.navigationLink
            )
        );

        state.sections = Array.from(
            document.querySelectorAll(
                selectors.legalSection
            )
        );

        state.linkMap.clear();

        state.links.forEach((link) => {
            const href = link.getAttribute("href");

            if (
                !href ||
                !href.startsWith("#")
            ) {
                return;
            }

            const section =
                getSectionFromHash(href);

            if (!section) {
                return;
            }

            state.linkMap.set(
                section.id,
                link
            );
        });
    }

    /* =======================================================
       Active Navigation State
       ======================================================= */

    function keepActiveLinkVisible(link) {
        if (!link) {
            return;
        }

        const navigation = link.closest(
            selectors.navigation
        );

        if (!navigation) {
            return;
        }

        const navigationStyle =
            window.getComputedStyle(navigation);

        const canScroll =
            navigation.scrollHeight >
            navigation.clientHeight + 2 &&
            (
                navigationStyle.overflowY ===
                "auto" ||
                navigationStyle.overflowY ===
                "scroll"
            );

        if (!canScroll) {
            return;
        }

        const navigationRect =
            navigation.getBoundingClientRect();

        const linkRect =
            link.getBoundingClientRect();

        const navigationHeading =
            navigation.querySelector("h2");

        const headingHeight =
            navigationHeading
                ? navigationHeading
                    .getBoundingClientRect()
                    .height
                : 0;

        const visibleTop =
            navigationRect.top +
            headingHeight +
            8;

        const visibleBottom =
            navigationRect.bottom - 8;

        if (linkRect.top < visibleTop) {
            navigation.scrollTo({
                top:
                    navigation.scrollTop -
                    (visibleTop - linkRect.top),
                behavior: "auto"
            });

            return;
        }

        if (linkRect.bottom > visibleBottom) {
            navigation.scrollTo({
                top:
                    navigation.scrollTop +
                    (linkRect.bottom -
                        visibleBottom),
                behavior: "auto"
            });
        }
    }

    function setActiveSection(
        section,
        {
            updateUrl = false,
            keepVisible = true,
            force = false
        } = {}
    ) {
        if (!section?.id) {
            return;
        }

        if (
            !force &&
            state.activeSectionId ===
            section.id
        ) {
            return;
        }

        state.activeSectionId = section.id;

        let activeLink = null;

        state.links.forEach((link) => {
            const href = link.getAttribute("href");

            const active =
                href === `#${section.id}`;

            link.classList.toggle(
                "is-active",
                active
            );

            if (active) {
                activeLink = link;

                link.setAttribute(
                    "aria-current",
                    "location"
                );
            } else {
                link.removeAttribute(
                    "aria-current"
                );
            }
        });

        if (
            keepVisible &&
            activeLink
        ) {
            keepActiveLinkVisible(activeLink);
        }

        if (updateUrl) {
            replaceHash(`#${section.id}`);
        }

        dispatchLegalEvent(
            "bathnice:legal-section-change",
            {
                id: section.id,
                hash: `#${section.id}`,
                title:
                    section.querySelector("h2")
                        ?.textContent.trim() || ""
            }
        );
    }

    function findActiveSection() {
        if (state.sections.length === 0) {
            return null;
        }

        const headerOffset =
            getAnchorOffset();

        const viewportMarker =
            window.scrollY +
            headerOffset +
            Math.min(
                window.innerHeight * 0.22,
                180
            );

        let activeSection =
            state.sections[0];

        state.sections.forEach(
            (section) => {
                const sectionTop =
                    getDocumentTop(section);

                if (
                    sectionTop <=
                    viewportMarker
                ) {
                    activeSection = section;
                }
            }
        );

        const nearDocumentEnd =
            window.innerHeight +
            window.scrollY >=
            getDocumentHeight() - 12;

        if (nearDocumentEnd) {
            activeSection =
                state.sections[
                state.sections.length - 1
                ];
        }

        return activeSection;
    }

    /* =======================================================
       Reading Progress
       ======================================================= */

    function updateReadingProgress() {
        const content = document.querySelector(
            selectors.legalContent
        );

        if (!content) {
            return;
        }

        const contentTop =
            getDocumentTop(content);

        const contentHeight =
            content.offsetHeight;

        const availableDistance = Math.max(
            1,
            contentHeight -
            window.innerHeight +
            getAnchorOffset()
        );

        const travelledDistance =
            window.scrollY -
            contentTop +
            getAnchorOffset();

        const progress = clamp(
            travelledDistance /
            availableDistance,
            0,
            1
        );

        const page =
            document.querySelector(
                selectors.page
            );

        page?.style.setProperty(
            "--legal-reading-progress",
            String(progress)
        );

        page?.style.setProperty(
            "--legal-reading-progress-percent",
            `${progress * 100}%`
        );

        dispatchLegalEvent(
            "bathnice:legal-reading-progress",
            {
                progress,
                percent: Math.round(
                    progress * 100
                )
            }
        );
    }

    function updateLegalPageState() {
        const activeSection =
            findActiveSection();

        if (activeSection) {
            setActiveSection(activeSection, {
                updateUrl: true
            });
        }

        updateReadingProgress();
    }

    /* =======================================================
       Smooth Anchor Navigation
       ======================================================= */

    function focusSectionHeading(section) {
        if (!section) {
            return;
        }

        const heading =
            section.querySelector("h2") ||
            section;

        const hadTabindex =
            heading.hasAttribute("tabindex");

        if (!hadTabindex) {
            heading.setAttribute(
                "tabindex",
                "-1"
            );
        }

        try {
            heading.focus({
                preventScroll: true
            });
        } catch {
            heading.focus();
        }

        if (!hadTabindex) {
            heading.addEventListener(
                "blur",
                () => {
                    heading.removeAttribute(
                        "tabindex"
                    );
                },
                {
                    once: true
                }
            );
        }
    }

    function scrollToSection(
        section,
        {
            updateHistory = false,
            focusHeading = false,
            behavior
        } = {}
    ) {
        if (!section) {
            return false;
        }

        const destination = Math.max(
            0,
            getDocumentTop(section) -
            getAnchorOffset()
        );

        const scrollBehavior =
            behavior ||
            (
                reducedMotionQuery.matches
                    ? "auto"
                    : "smooth"
            );

        setActiveSection(section, {
            updateUrl: false,
            force: true
        });

        window.scrollTo({
            top: destination,
            behavior: scrollBehavior
        });

        if (updateHistory) {
            pushHash(`#${section.id}`);
        }

        if (focusHeading) {
            const focusDelay =
                scrollBehavior === "smooth"
                    ? 450
                    : 0;

            window.setTimeout(() => {
                focusSectionHeading(section);
            }, focusDelay);
        }

        return true;
    }

    function navigateToHash(
        hash,
        {
            behavior,
            focusHeading = false,
            updateHistory = false
        } = {}
    ) {
        const section =
            getSectionFromHash(hash);

        if (
            !section ||
            !section.matches(
                selectors.legalSection
            )
        ) {
            return false;
        }

        return scrollToSection(section, {
            behavior,
            focusHeading,
            updateHistory
        });
    }

    /* =======================================================
       Navigation Event Listeners
       ======================================================= */

    function initLegalNavigationLinks() {
        state.links.forEach((link) => {
            if (
                link.dataset.legalAnchorInitialized ===
                "true"
            ) {
                return;
            }

            const href =
                link.getAttribute("href");

            const section =
                getSectionFromHash(href);

            if (!section) {
                return;
            }

            link.dataset.legalAnchorInitialized =
                "true";

            link.addEventListener(
                "click",
                (event) => {
                    if (isModifiedClick(event)) {
                        return;
                    }

                    event.preventDefault();

                    scrollToSection(section, {
                        updateHistory: true,
                        focusHeading: false
                    });
                }
            );
        });
    }

    function handleDocumentAnchorClick(
        event
    ) {
        const link = event.target.closest(
            'a[href^="#"]'
        );

        if (
            !link ||
            link.matches(
                selectors.navigationLink
            ) ||
            isModifiedClick(event)
        ) {
            return;
        }

        const href =
            link.getAttribute("href");

        const target =
            getSectionFromHash(href);

        if (
            !target ||
            !target.matches(
                selectors.legalSection
            )
        ) {
            return;
        }

        event.preventDefault();

        scrollToSection(target, {
            updateHistory: true,
            focusHeading: true
        });
    }

    function handleHistoryNavigation() {
        if (!window.location.hash) {
            updateLegalPageState();
            return;
        }

        scheduleHashNavigation(
            window.location.hash,
            {
                behavior: reducedMotionQuery.matches
                    ? "auto"
                    : "smooth",
                focusHeading: false
            }
        );
    }

    /* =======================================================
       Layout Observers
       ======================================================= */

    function initResizeObserver() {
        if (
            typeof window.ResizeObserver !==
            "function"
        ) {
            return;
        }

        const observedElements = [
            document.documentElement,
            document.querySelector(
                selectors.legalContent
            ),
            document.querySelector(
                selectors.header
            )
        ].filter(Boolean);

        state.resizeObserver =
            new ResizeObserver(() => {
                scheduleScrollUpdate();
            });

        observedElements.forEach(
            (element) => {
                state.resizeObserver.observe(
                    element
                );
            }
        );
    }

    function initMutationObserver() {
        if (
            typeof window.MutationObserver !==
            "function"
        ) {
            return;
        }

        const content = document.querySelector(
            selectors.legalContent
        );

        if (!content) {
            return;
        }

        state.mutationObserver =
            new MutationObserver(() => {
                scheduleScrollUpdate();
            });

        state.mutationObserver.observe(
            content,
            {
                childList: true,
                subtree: true,
                characterData: true
            }
        );
    }

    /* =======================================================
       Initial Hash Alignment
       ======================================================= */

    function alignInitialHash() {
        if (!window.location.hash) {
            updateLegalPageState();
            return;
        }

        scheduleHashNavigation(
            window.location.hash,
            {
                behavior: "auto",
                focusHeading: false
            }
        );
    }

    function handleWindowLoad() {
        /*
         * Fonts and external resources may change heading positions.
         * Realign once after the full page load.
         */
        if (window.location.hash) {
            scheduleHashNavigation(
                window.location.hash,
                {
                    behavior: "auto",
                    focusHeading: false
                }
            );
        } else {
            scheduleScrollUpdate();
        }
    }

    /* =======================================================
       Refresh and Cleanup
       ======================================================= */

    function refreshLegalPage() {
        if (!isLegalPage()) {
            return;
        }

        collectLegalElements();
        initLegalNavigationLinks();

        if (window.location.hash) {
            const section =
                getSectionFromHash(
                    window.location.hash
                );

            if (
                section &&
                section.matches(
                    selectors.legalSection
                )
            ) {
                setActiveSection(section, {
                    force: true
                });
            }
        }

        scheduleScrollUpdate();
    }

    function cleanupLegalPage() {
        state.cleanupCallbacks.forEach(
            (callback) => {
                try {
                    callback();
                } catch {
                    /*
                     * Cleanup errors should not interrupt
                     * restoration or page navigation.
                     */
                }
            }
        );

        state.cleanupCallbacks = [];

        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }

        if (state.mutationObserver) {
            state.mutationObserver.disconnect();
            state.mutationObserver = null;
        }

        if (state.scrollFrame) {
            window.cancelAnimationFrame(
                state.scrollFrame
            );

            state.scrollFrame = 0;
        }

        if (state.hashFrame) {
            window.cancelAnimationFrame(
                state.hashFrame
            );

            state.hashFrame = 0;
        }
    }

    /* =======================================================
       Initialization
       ======================================================= */

    function initLegalPage() {
        if (
            state.initialized ||
            !isLegalPage()
        ) {
            return;
        }

        state.initialized = true;

        collectLegalElements();
        initLegalNavigationLinks();
        initResizeObserver();
        initMutationObserver();

        window.addEventListener(
            "scroll",
            scheduleScrollUpdate,
            {
                passive: true
            }
        );

        window.addEventListener(
            "resize",
            scheduleScrollUpdate,
            {
                passive: true
            }
        );

        window.addEventListener(
            "orientationchange",
            scheduleScrollUpdate
        );

        window.addEventListener(
            "hashchange",
            handleHistoryNavigation
        );

        window.addEventListener(
            "popstate",
            handleHistoryNavigation
        );

        window.addEventListener(
            "load",
            handleWindowLoad,
            {
                once: true
            }
        );

        document.addEventListener(
            "click",
            handleDocumentAnchorClick
        );

        state.cleanupCallbacks.push(() => {
            window.removeEventListener(
                "scroll",
                scheduleScrollUpdate
            );

            window.removeEventListener(
                "resize",
                scheduleScrollUpdate
            );

            window.removeEventListener(
                "orientationchange",
                scheduleScrollUpdate
            );

            window.removeEventListener(
                "hashchange",
                handleHistoryNavigation
            );

            window.removeEventListener(
                "popstate",
                handleHistoryNavigation
            );

            document.removeEventListener(
                "click",
                handleDocumentAnchorClick
            );
        });

        alignInitialHash();

        dispatchLegalEvent(
            "bathnice:legal-ready",
            {
                page:
                    document.querySelector(
                        selectors.page
                    )?.dataset.legalPage || "",
                sections: state.sections.length
            }
        );

        requestGlobalLayoutRefresh();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initLegalPage,
            {
                once: true
            }
        );
    } else {
        initLegalPage();
    }

    window.addEventListener(
        "pageshow",
        (event) => {
            if (!isLegalPage()) {
                return;
            }

            if (!state.initialized) {
                initLegalPage();
                return;
            }

            if (event.persisted) {
                window.requestAnimationFrame(() => {
                    refreshLegalPage();

                    if (window.location.hash) {
                        scheduleHashNavigation(
                            window.location.hash,
                            {
                                behavior: "auto",
                                focusHeading: false
                            }
                        );
                    }
                });
            }
        }
    );

    window.addEventListener(
        "pagehide",
        (event) => {
            /*
             * Keep listeners intact when entering bfcache.
             * They are needed after the pageshow restoration event.
             */
            if (event.persisted) {
                return;
            }

            cleanupLegalPage();
        }
    );

    window.BathNiceLegal = Object.freeze({
        refresh: refreshLegalPage,

        getActiveSection() {
            return state.activeSectionId;
        },

        getSections() {
            return state.sections.map(
                (section) => ({
                    id: section.id,
                    title:
                        section.querySelector("h2")
                            ?.textContent.trim() || ""
                })
            );
        },

        scrollToSection(sectionId, options = {}) {
            const normalizedId = String(
                sectionId || ""
            ).replace(/^#/, "");

            const section =
                document.getElementById(
                    normalizedId
                );

            if (
                !section ||
                !section.matches(
                    selectors.legalSection
                )
            ) {
                return false;
            }

            return scrollToSection(section, {
                updateHistory:
                    options.updateHistory !== false,
                focusHeading:
                    options.focusHeading === true,
                behavior: options.behavior
            });
        }
    });
})();
