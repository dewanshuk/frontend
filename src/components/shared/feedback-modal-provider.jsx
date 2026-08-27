import React, { createContext, useCallback, useContext, useState } from "react";
import FeedbackDialog from "../../pages/Feedback.jsx";

const FeedbackModalContext = createContext(null);

export function FeedbackModalProvider({ children }) {
    const [open, setOpen] = useState(false);

    const openFeedback = useCallback(() => setOpen(true), []);
    const closeFeedback = useCallback(() => setOpen(false), []);

    return (
        <FeedbackModalContext.Provider value={{ openFeedback, closeFeedback }}>
            {children}
            {/* Render once at root so it overlays any route/page */}
            <FeedbackDialog open={open} onOpenChange={setOpen} />
        </FeedbackModalContext.Provider>
    );
}

export function useFeedbackModal() {
    const ctx = useContext(FeedbackModalContext);
    if (!ctx) throw new Error("useFeedbackModal must be used within FeedbackModalProvider");
    return ctx;
}