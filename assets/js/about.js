"use strict";

/**
 * BathNice About page interactions.
 *
 * Responsibilities:
 * - track the active chapter in the homeowner journey;
 * - update the journey stage number and progress line;
 * - apply restrained desktop-only parallax;
 * - disable scroll motion on tablet, mobile, and reduced-motion mode;
 * - refresh AOS after About-page elements are ready.
 */

(() => {
    const state = {
        initialized: false,
        activeJourneyStep: 1,
        journeyObserver: null,
        parallaxFrame: null,
        parallaxEnabled: false,
        resizeFrame: null
    };

    const selectors = {
        page: ".about-page",

        journey: "[data-about-journey]",
        journeyStep: "[data-about-journey-step]",
        journeyProgress: "[data-about-journey-progress]",
        journeyCurrent: "[data-about-journey-current]",

        parallaxSection: "[data-about-parallax]",
        parallaxMedia: "[data-about-parallax-media]"
    };

    const tabletMedia = window.matchMedia("(max-width: 960px)");

    const reducedMotionMedia = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function isAboutPage() {
        return Boolean(document.querySelector(selectors.page));
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

    /* =======================================================
       Journey Progress
       ======================================================= */

    function getJourneyElements() {
        const root = document.querySelector(selectors.journey);

        if (!root) {
            return null;
        }

        return {
            root,
            steps: Array.from(
                root.querySelectorAll(selectors.journeyStep)
            ),
            progress: root.querySelector(selectors.journeyProgress),
            current: root.querySelector(selectors.journeyCurrent)
        };
    }

    function normalizeJourneyStep(value, totalSteps) {
        const parsedValue = Number.parseInt(value, 10);

        if (!Number.isFinite(parsedValue)) {
            return 1;
        }

        return Math.min(
            Math.max(parsedValue, 1),
            Math.max(totalSteps, 1)
        );
    }

    function formatJourneyStep(step) {
        return String(step).padStart(2, "0");
    }

    function updateJourneyProgress(stepNumber) {
        const elements = getJourneyElements();

        if (!elements || !elements.steps.length) {
            return;
        }

        const totalSteps = elements.steps.length;

        const normalizedStep = normalizeJourneyStep(
            stepNumber,
            totalSteps
        );

        state.activeJourneyStep = normalizedStep;

        if (elements.current) {
            elements.current.textContent =
                formatJourneyStep(normalizedStep);
        }

        if (elements.progress) {
            const progressPercentage =
                (normalizedStep / totalSteps) * 100;

            elements.progress.style.width =
                `${progressPercentage}%`;
        }

        elements.steps.forEach((step) => {
            const stepValue = normalizeJourneyStep(
                step.dataset.aboutJourneyStep,
                totalSteps
            );

            const isActive = stepValue === normalizedStep;
            const isComplete = stepValue < normalizedStep;

            step.classList.toggle("is-active", isActive);
            step.classList.toggle("is-complete", isComplete);

            if (isActive) {
                step.setAttribute("data-active-step", "true");
            } else {
                step.removeAttribute("data-active-step");
            }
        });
    }

    function calculateClosestJourneyStep() {
        const elements = getJourneyElements();

        if (!elements || !elements.steps.length) {
            return;
        }

        const viewportReference =
            window.innerHeight * 0.42;

        let closestStep = 1;
        let closestDistance = Number.POSITIVE_INFINITY;

        elements.steps.forEach((step) => {
            const rect = step.getBoundingClientRect();

            const stepReference =
                rect.top + Math.min(rect.height * 0.28, 180);

            const distance = Math.abs(
                stepReference - viewportReference
            );

            if (distance < closestDistance) {
                closestDistance = distance;

                closestStep = normalizeJourneyStep(
                    step.dataset.aboutJourneyStep,
                    elements.steps.length
                );
            }
        });

        updateJourneyProgress(closestStep);
    }

    function disconnectJourneyObserver() {
        if (!state.journeyObserver) {
            return;
        }

        state.journeyObserver.disconnect();
        state.journeyObserver = null;
    }

    function initJourneyObserver() {
        const elements = getJourneyElements();

        if (
            !elements ||
            !elements.steps.length ||
            elements.root.dataset.journeyInitialized === "true"
        ) {
            return;
        }

        elements.root.dataset.journeyInitialized = "true";

        updateJourneyProgress(1);

        if (!("IntersectionObserver" in window)) {
            window.addEventListener(
                "scroll",
                calculateClosestJourneyStep,
                {
                    passive: true
                }
            );

            return;
        }

        state.journeyObserver = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((firstEntry, secondEntry) => {
                        const firstDistance = Math.abs(
                            firstEntry.boundingClientRect.top -
                            window.innerHeight * 0.35
                        );

                        const secondDistance = Math.abs(
                            secondEntry.boundingClientRect.top -
                            window.innerHeight * 0.35
                        );

                        return firstDistance - secondDistance;
                    });

                if (!visibleEntries.length) {
                    return;
                }

                const activeEntry = visibleEntries[0];

                const activeStep = normalizeJourneyStep(
                    activeEntry.target.dataset.aboutJourneyStep,
                    elements.steps.length
                );

                updateJourneyProgress(activeStep);
            },
            {
                root: null,
                rootMargin: "-22% 0px -46% 0px",
                threshold: [0.05, 0.2, 0.45, 0.7]
            }
        );

        elements.steps.forEach((step) => {
            state.journeyObserver.observe(step);
        });
    }

    /* =======================================================
       About Parallax
       ======================================================= */

    function getParallaxElements() {
        const section = document.querySelector(
            selectors.parallaxSection
        );

        if (!section) {
            return null;
        }

        const media = section.querySelector(
            selectors.parallaxMedia
        );

        if (!media) {
            return null;
        }

        return {
            section,
            media
        };
    }

    function shouldEnableParallax() {
        return (
            !tabletMedia.matches &&
            !reducedMotionMedia.matches &&
            window.innerWidth > 960
        );
    }

    function resetParallax() {
        const elements = getParallaxElements();

        if (!elements) {
            return;
        }

        elements.media.style.transform = "";
        elements.media.style.removeProperty(
            "--about-parallax-offset"
        );
    }

    function calculateParallaxOffset(section) {
        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        if (
            rect.bottom <= 0 ||
            rect.top >= viewportHeight
        ) {
            return null;
        }

        const sectionCenter =
            rect.top + rect.height / 2;

        const viewportCenter =
            viewportHeight / 2;

        const distanceFromCenter =
            sectionCenter - viewportCenter;

        const normalizedDistance =
            distanceFromCenter /
            Math.max(
                viewportHeight + rect.height,
                1
            );

        const maximumMovement = 34;

        return Math.max(
            -maximumMovement,
            Math.min(
                maximumMovement,
                normalizedDistance *
                maximumMovement *
                -2
            )
        );
    }

    function updateParallaxPosition() {
        state.parallaxFrame = null;

        if (!state.parallaxEnabled) {
            return;
        }

        const elements = getParallaxElements();

        if (!elements) {
            return;
        }

        const offset = calculateParallaxOffset(
            elements.section
        );

        if (offset === null) {
            return;
        }

        elements.media.style.transform =
            `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    }

    function requestParallaxUpdate() {
        if (
            !state.parallaxEnabled ||
            state.parallaxFrame !== null
        ) {
            return;
        }

        state.parallaxFrame =
            window.requestAnimationFrame(
                updateParallaxPosition
            );
    }

    function enableParallax() {
        if (state.parallaxEnabled) {
            requestParallaxUpdate();
            return;
        }

        const elements = getParallaxElements();

        if (!elements) {
            return;
        }

        state.parallaxEnabled = true;

        window.addEventListener(
            "scroll",
            requestParallaxUpdate,
            {
                passive: true
            }
        );

        requestParallaxUpdate();
    }

    function disableParallax() {
        if (!state.parallaxEnabled) {
            resetParallax();
            return;
        }

        state.parallaxEnabled = false;

        window.removeEventListener(
            "scroll",
            requestParallaxUpdate
        );

        if (state.parallaxFrame !== null) {
            window.cancelAnimationFrame(
                state.parallaxFrame
            );

            state.parallaxFrame = null;
        }

        resetParallax();
    }

    function updateParallaxMode() {
        if (shouldEnableParallax()) {
            enableParallax();
        } else {
            disableParallax();
        }
    }

    /* =======================================================
       Resize and Preference Changes
       ======================================================= */

    function handleViewportChange() {
        if (state.resizeFrame !== null) {
            window.cancelAnimationFrame(
                state.resizeFrame
            );
        }

        state.resizeFrame =
            window.requestAnimationFrame(() => {
                state.resizeFrame = null;

                updateParallaxMode();
                calculateClosestJourneyStep();
                refreshAOS();
            });
    }

    function handleMotionPreferenceChange() {
        updateParallaxMode();
    }

    /* =======================================================
       Page Initialization
       ======================================================= */

    function initAboutPage() {
        if (
            state.initialized ||
            !isAboutPage()
        ) {
            return;
        }

        state.initialized = true;

        initJourneyObserver();
        updateParallaxMode();

        addMediaListener(
            tabletMedia,
            handleViewportChange
        );

        addMediaListener(
            reducedMotionMedia,
            handleMotionPreferenceChange
        );

        window.addEventListener(
            "resize",
            handleViewportChange,
            {
                passive: true
            }
        );

        window.addEventListener(
            "orientationchange",
            handleViewportChange,
            {
                passive: true
            }
        );

        refreshAOS();

        document.dispatchEvent(
            new CustomEvent("bathnice:about-ready", {
                detail: {
                    activeJourneyStep:
                        state.activeJourneyStep
                }
            })
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initAboutPage,
            {
                once: true
            }
        );
    } else {
        initAboutPage();
    }

    window.addEventListener(
        "load",
        () => {
            if (!isAboutPage()) {
                return;
            }

            calculateClosestJourneyStep();
            updateParallaxMode();
            refreshAOS();
        },
        {
            once: true
        }
    );
})();