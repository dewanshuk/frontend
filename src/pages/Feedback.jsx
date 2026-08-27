import React, { useState } from "react";
import { Star } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import CenterToast from "@/components/shared/CenterToast";
import { submitFeedback } from "@/api/FeedbackApi";

export default function FeedbackDialog({ open, onOpenChange }) {
    const [rating, setRating] = useState(0);   // 0..5
    const [hovered, setHovered] = useState(0); // 0..5 hover preview
    const [message, setMessage] = useState("");
    const [errors, setErrors] = useState({ rating: "", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, variant: "success", message: "" });

    const effectiveFill = (index) => {
        const active = hovered ? hovered : rating;
        return index <= active;
    };

    const reset = () => {
        setRating(0);
        setHovered(0);
        setMessage("");
        setErrors({ rating: "", message: "" });
    };

    const handleClose = (force = false) => {
        if (isSubmitting && !force) return;
        onOpenChange(false);
        reset();
    };

    const closeToast = () => setToast((t) => ({ ...t, open: false }));
    const showToast = (variant, toastMessage) => {
        setToast({ open: true, variant, message: toastMessage });
        window.setTimeout(() => {
            setToast((t) => (t.open ? { ...t, open: false } : t));
        }, 2400);
    };

    const validate = () => {
        const next = { rating: "", message: "" };
        if (rating < 1 || rating > 5) next.rating = "Please select a rating between 1 and 5.";
        if (!message.trim()) next.message = "Feedback message is required.";
        setErrors(next);
        return !next.rating && !next.message;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setIsSubmitting(true);

            const res = await submitFeedback({
                rating,
                description: message.trim(),
            });

            const statusText = typeof res === "string" ? res.toLowerCase() : String(res?.message ?? "").toLowerCase();
            console.log(statusText);
            if (statusText === "feedback submitted successfully") {
                showToast("success", "Feedback submitted successfully.");
                handleClose(true);
                return;
            }

            showToast("error", "Feedback submission failed.");
        } catch (err) {
            showToast("error", err?.message || "Feedback submission failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
            <DialogContent
                className="
          p-0 sm:max-w-[600px]
          rounded-2xl overflow-hidden shadow-xl
          [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent
          [&>button]:text-gray-600 [&>button]:shadow-none
          [&>button:hover]:!border-gray-400 [&>button:hover]:!bg-gray-200 [&>button:hover]:!text-gray-700
          [&>button:active]:!border-gray-400 [&>button:active]:!bg-gray-200 [&>button:active]:!text-gray-700
          [&>button:focus-visible]:!border-gray-400 [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-gray-300
          [&>button]:focus-visible:ring-offset-0
        "
            >
                <div className="p-6">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-[20px] font-semibold text-gray-900">
                            Feedback Form
                        </DialogTitle>

                        <DialogDescription className="text-[14px] text-gray-600 leading-6">
                            We’d love to hear your thoughts! Please rate your experience and share your feedback.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                        {/* Rating */}
                        <div className="space-y-2">
                            <Label className="text-[14px] font-medium text-gray-800">
                                Rating<span className="text-red-500">*</span>
                            </Label>

                            <div
                                className="flex items-center gap-3"
                                onMouseLeave={() => setHovered(0)}
                            >
                                {[1, 2, 3, 4, 5].map((i) => {
                                    const active = effectiveFill(i);
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
                                            onMouseEnter={() => setHovered(i)}
                                            onFocus={() => setHovered(i)}
                                            onMouseLeave={() => setHovered(0)}
                                            onBlur={() => setHovered(0)}
                                            onClick={() => setRating(i)}
                                            className="p-0.5"
                                        >
                                            <Star
                                                className={`h-7 w-7 transition-colors ${active ? "text-blue-600" : "text-gray-400"
                                                    }`}
                                                fill={active ? "rgb(37 99 235)" : "transparent"} // Tailwind blue-600
                                                strokeWidth={1.75}
                                            />
                                        </button>
                                    );
                                })}
                            </div>

                            {errors.rating ? (
                                <p className="text-xs text-red-600 mt-1">{errors.rating}</p>
                            ) : null}
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <Label className="text-[14px] font-medium text-gray-800">
                                Your Feedback<span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Tell us what you think..."
                                className="
                  min-h-[120px] resize-y text-[14px]
                  placeholder:text-gray-400
                  focus-visible:ring-blue-600
                "
                                aria-invalid={!!errors.message}
                            />
                            {errors.message ? (
                                <p className="text-xs text-red-600 mt-1">{errors.message}</p>
                            ) : null}
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="
                  w-full h-11 bg-blue-600 hover:bg-blue-700
                  text-white text-[14px] font-medium rounded-md
                "
                            >
                                {isSubmitting ? "Submitting..." : "Submit Feedback"}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
            <CenterToast open={toast.open} variant={toast.variant} message={toast.message} onClose={closeToast} />
        </Dialog>
    );
}