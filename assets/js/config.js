"use strict";

/**
 * BathNice global configuration.
 *
 * Edit this file to update shared business, contact, navigation,
 * legal, form, SEO, and service information across the website.
 *
 * contact.php cannot read this JavaScript object.
 * The recipient email must also be updated manually in contact.php.
 */

window.BATHNICE_CONFIG = {
    brand: {
        name: "BathNice",
        shortName: "BN",
        tagline: "Independent Bathroom Remodeling Provider Matching",
        description:
            "BathNice helps homeowners share bathroom-remodeling project details and explore participating local provider options."
    },

    company: {
        legalName: "BathNice Matching Group LLC",
        companyId: "BN-US-48271",
        address: "1847 Harbor Ridge Lane, Suite 205",
        cityStateZip: "Portland, OR 97209",
        country: "United States",
        serviceArea: "Selected local markets",
        mapHref:
            "https://maps.google.com/?q=1847%20Harbor%20Ridge%20Lane%2C%20Suite%20205%2C%20Portland%2C%20OR%2097209"
    },

    contact: {
        phoneDisplay: "+1 (555) 018-2846",
        phoneRaw: "+15550182846",
        phoneHref: "tel:+15550182846",
        phoneButtonText: "Start Request",

        email: "hello@bathnice.com",
        emailHref: "mailto:hello@bathnice.com",
        emailButtonText: "Email BathNice"
    },

    services: [
        {
            id: "full-bathroom-remodeling",
            name: "Full Bathroom Remodeling",
            shortName: "Full Remodeling",
            slug: "full-bathroom-remodeling",
            url: "full-bathroom-remodeling.html",
            icon: "ruler",
            formValue: "Full Bathroom Remodeling",
            summary:
                "Explore provider options for complete-room bathroom remodeling projects involving layout, fixtures, storage, finishes, tile, and ventilation."
        },
        {
            id: "shower-remodeling",
            name: "Shower Remodeling",
            shortName: "Shower Remodeling",
            slug: "shower-remodeling",
            url: "shower-remodeling.html",
            icon: "shower-head",
            formValue: "Shower Remodeling",
            summary:
                "Share plans involving shower layouts, enclosures, drainage, wall finishes, storage niches, seating, and easier entry."
        },
        {
            id: "bathtub-replacement",
            name: "Bathtub Replacement",
            shortName: "Bathtub Replacement",
            slug: "bathtub-replacement",
            url: "bathtub-replacement.html",
            icon: "bath",
            formValue: "Bathtub Replacement",
            summary:
                "Explore provider options for alcove, freestanding, and easier-access bathtub replacement projects."
        },
        {
            id: "tile-installation",
            name: "Tile Installation",
            shortName: "Tile Installation",
            slug: "tile-installation",
            url: "tile-installation.html",
            icon: "grid-3x3",
            formValue: "Tile Installation",
            summary:
                "Prepare a request for bathroom floor, wall, shower, pattern, grout, substrate, and transition work."
        },
        {
            id: "bathroom-vanities",
            name: "Bathroom Vanities",
            shortName: "Bathroom Vanities",
            slug: "bathroom-vanities",
            url: "bathroom-vanities.html",
            icon: "panel-top",
            formValue: "Bathroom Vanities",
            summary:
                "Explore options involving vanity width, storage, basins, countertops, mirrors, lighting, and plumbing placement."
        },
        {
            id: "accessible-bathrooms",
            name: "Accessible Bathrooms",
            shortName: "Accessible Bathrooms",
            slug: "accessible-bathrooms",
            url: "accessible-bathrooms.html",
            icon: "accessibility",
            formValue: "Accessible Bathrooms",
            summary:
                "Share priorities involving easier access, circulation, shower entry, seating, grab-bar planning, and fixture heights."
        }
    ],

    urls: {
        home: "index.html",
        about: "about.html",
        allServices: "all-services.html",
        contact: "contact.html",

        fullBathroomRemodeling: "full-bathroom-remodeling.html",
        showerRemodeling: "shower-remodeling.html",
        bathtubReplacement: "bathtub-replacement.html",
        tileInstallation: "tile-installation.html",
        bathroomVanities: "bathroom-vanities.html",
        accessibleBathrooms: "accessible-bathrooms.html",

        privacy: "privacy-policy.html",
        terms: "terms-of-service.html",
        cookies: "cookie-policy.html"
    },

    navigation: {
        main: [
            {
                label: "Home",
                urlKey: "home"
            },
            {
                label: "About",
                urlKey: "about"
            },
            {
                label: "Services",
                urlKey: "allServices",
                hasDropdown: true
            },
            {
                label: "Contact",
                urlKey: "contact"
            }
        ],

        legal: [
            {
                label: "Privacy Policy",
                urlKey: "privacy"
            },
            {
                label: "Terms of Service",
                urlKey: "terms"
            },
            {
                label: "Cookie Policy",
                urlKey: "cookies"
            }
        ]
    },

    callsToAction: {
        primary: {
            label: "Start a Request",
            url: "contact.html"
        },

        services: {
            label: "Explore Services",
            url: "all-services.html"
        },

        process: {
            label: "See How It Works",
            url: "about.html"
        },

        contact: {
            label: "Contact BathNice",
            url: "contact.html"
        },

        preFooter: {
            eyebrow: "Prepare your next step",
            title: "Planning a bathroom update?",
            description:
                "Share your project details and explore available provider options in your area.",
            primaryLabel: "Start Your Request",
            primaryUrl: "contact.html",
            secondaryLabel: "Explore Services",
            secondaryUrl: "all-services.html"
        }
    },

    footer: {
        description:
            "BathNice is an independent platform that helps homeowners connect with participating bathroom-remodeling providers in selected local markets.",

        contactHeading: "Contact",
        navigationHeading: "Explore",
        servicesHeading: "Bathroom Options",
        legalHeading: "Legal",

        serviceAreaLabel: "Service area",
        companyIdLabel: "Company ID",

        copyright:
            "© {year} BathNice Matching Group LLC. All rights reserved."
    },

    legal: {
        shortDisclaimer:
            "BathNice is an independent provider-matching platform. Participating providers are independent businesses, and homeowners decide whether to continue with any provider.",

        providerNotice:
            "Provider availability may vary by location. Final pricing, schedules, warranties, project scope, and service terms are supplied directly by participating providers.",

        verificationNotice:
            "Homeowners should independently verify licensing, insurance, references, applicable requirements, and other provider information before entering into an agreement.",

        requestNotice:
            "Submitting a request does not create a service agreement and does not guarantee that a provider will contact you.",

        accessibilityNotice:
            "Discuss applicable accessibility requirements with qualified providers and relevant local authorities.",

        imageNotice:
            "People shown in website photography are illustrative actors or models and are not BathNice employees or participating providers.",

        shortFormDisclaimer:
            "BathNice does not directly perform bathroom remodeling or guarantee provider work, pricing, availability, credentials, or project outcomes.",

        fullDisclaimer:
            "Disclaimer: This site is a free service to assist homeowners in connecting with local service providers. All contractors/providers are independent and this site does not warrant or guarantee any work performed. It is the responsibility of the homeowner to verify that the hired contractor furnishes the necessary license and insurance required for the work being performed. All persons depicted in a photo or video are actors or models and not contractors listed on this site."
    },

    form: {
        endpoint: "contact.php",
        method: "POST",
        recipient: "hello@bathnice.com",

        servicePlaceholder: "Select a project type",
        submitLabel: "Submit Request",
        submittingLabel: "Submitting Request…",

        consentText:
            "By submitting this request, you agree that BathNice and participating providers may contact you about your project. Submission does not create a service agreement.",

        privacyLabel:
            "I have read the Privacy Policy and agree to the contact terms above.",

        successMessage:
            "Thank you. Your request has been received.",

        validationMessage:
            "Please check the required fields and try again.",

        networkErrorMessage:
            "The request could not be submitted right now. Please try again or contact BathNice by phone or email.",

        duplicateMessage:
            "Your request is already being submitted.",

        minimumSubmissionSeconds: 3,

        fields: {
            fullName: {
                label: "Full name",
                autocomplete: "name"
            },

            email: {
                label: "Email address",
                autocomplete: "email"
            },

            phone: {
                label: "Phone number",
                autocomplete: "tel"
            },

            service: {
                label: "Project type"
            },

            message: {
                label: "Tell us about your bathroom project"
            },

            privacyConsent: {
                label: "Contact consent"
            }
        }
    },

    cookieConsent: {
        storageKey: "bathnice-cookie-consent",
        version: "1",

        message:
            "BathNice uses essential browser storage to remember your privacy choice and support core website functionality.",

        acceptLabel: "Accept",
        declineLabel: "Decline",

        privacyLabel: "Privacy Policy",
        privacyUrl: "privacy-policy.html",

        cookieLabel: "Cookie Policy",
        cookieUrl: "cookie-policy.html",

        termsLabel: "Terms",
        termsUrl: "terms-of-service.html"
    },

    seo: {
        siteName: "BathNice",
        locale: "en_US",

        /**
         * Replace with the final production domain before launch.
         */
        baseUrl: "https://www.bathnice.com/",

        defaultTitle:
            "BathNice | Bathroom Remodeling Provider Matching",

        defaultDescription:
            "Share your bathroom-remodeling project details and explore participating local provider options through BathNice.",

        defaultOgImage: "assets/images/hero-home.jpg"
    },

    accessibility: {
        skipLinkLabel: "Skip to main content",
        menuOpenLabel: "Open navigation menu",
        menuCloseLabel: "Close navigation menu",
        servicesOpenLabel: "Open bathroom services menu",
        phoneActionLabel: "Call BathNice",
        emailActionLabel: "Email BathNice",
        backToTopLabel: "Back to top"
    }
};