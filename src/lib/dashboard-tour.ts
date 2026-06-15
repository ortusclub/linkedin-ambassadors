import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const SEEN_KEY = "lv_dashboard_tour_v1";

// Guided product tour for the renter dashboard (driver.js).
// `force` = true replays it even if the user has seen it (the "Take a tour" button).
export function startDashboardTour(force = false) {
  if (typeof window === "undefined") return;
  if (!force) {
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      // localStorage unavailable (private mode) — just show the tour.
    }
  }

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const tour = driver({
    showProgress: true,
    allowClose: true,
    overlayColor: "#0B1A2E",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it",
    steps: [
      {
        popover: {
          title: "Welcome to LinkedVelocity 👋",
          description:
            "Here's a 30-second tour of your dashboard so you know exactly where everything is. You can replay it any time from \"Take a tour\".",
        },
      },
      {
        element: '[data-tour="browse"]',
        popover: {
          title: "Browse accounts",
          description:
            "Start here. Browse verified LinkedIn accounts and rent the ones that fit your target audience.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="getting-started"]',
        popover: {
          title: "Getting started guide",
          description:
            "New to renting? This guide covers how it works, setting up GoLogin, daily limits, and using your account safely.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="wallet"]',
        popover: {
          title: "Your wallet",
          description:
            "Top up your balance here to rent instantly — or just pay by card at checkout. Your choice.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="rentals"]',
        popover: {
          title: "Your rented accounts",
          description:
            "Every account you rent appears here. Once we've prepared it, you'll open it securely through GoLogin right from this table.",
          side: "top",
          align: "start",
        },
      },
    ],
    onDestroyed: markSeen,
  });

  tour.drive();
}

// True if the user hasn't seen the tour yet — used to auto-start it once.
export function shouldAutoStartTour() {
  if (typeof window === "undefined") return false;
  try {
    return !localStorage.getItem(SEEN_KEY);
  } catch {
    return false;
  }
}
