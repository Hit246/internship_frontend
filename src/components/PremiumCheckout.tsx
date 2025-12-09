"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog } from "./ui/dialog";
import { AlertCircle, Crown, X } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface PremiumCheckoutProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const PremiumCheckout: React.FC<PremiumCheckoutProps> = ({
    userId,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
        "monthly"
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const plans = {
        monthly: {
            name: "Monthly Premium",
            price: 99,
            duration: "1 Month",
            savings: undefined,
            benefits: [
                "Unlimited downloads",
                "Ad-free experience",
                "Priority support",
                "Valid for 1 month",
            ],
        },
        yearly: {
            name: "Yearly Premium",
            price: 999,
            duration: "1 Year",
            savings: "16% off",
            benefits: [
                "Unlimited downloads",
                "Ad-free experience",
                "Priority support",
                "Valid for 1 year",
            ],
        },
    };

    const currentPlan = plans[selectedPlan];

    const handlePayment = async () => {
        setLoading(true);
        setError("");

        try {
            const orderResponse = await axiosInstance.post("/payment/create-order", {
                userid: userId,
                planType: selectedPlan,
            });

            if (!orderResponse.data.success) {
                throw new Error("Failed to create order");
            }

            const orderId = orderResponse.data.order.id;
            const amount = orderResponse.data.order.amount;

            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            script.onload = () => {
                handleRazorpayPayment(orderId, amount);
            };
            document.body.appendChild(script);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || "Payment failed";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleRazorpayPayment = (orderId: string, amount: number) => {
        // Demo mode - simulate payment
        if (orderId.includes("demo")) {
            // Simulate payment success after 1 second
            setTimeout(async () => {
                try {
                    const verifyResponse = await axiosInstance.post(
                        "/payment/verify-payment",
                        {
                            userid: userId,
                            razorpay_order_id: orderId,
                            razorpay_payment_id: `pay_demo_${Date.now()}`,
                            razorpay_signature: "demo_signature",
                            planType: selectedPlan,
                        }
                    );

                    if (verifyResponse.data.success) {
                        toast.success("✓ Premium activated successfully!");
                        onSuccess();
                        onClose();
                    }
                } catch (err: any) {
                    const errorMsg =
                        err.response?.data?.message || "Payment verification failed";
                    setError(errorMsg);
                    toast.error(errorMsg);
                }
            }, 1000);
            return;
        }

        // Production mode - use actual Razorpay
        if (typeof window.Razorpay === "undefined") {
            toast.error("Razorpay script not loaded");
            return;
        }

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
            amount,
            currency: "INR",
            name: "YourTube Premium",
            description: `Premium ${selectedPlan} Subscription`,
            order_id: orderId,
            handler: async (response: any) => {
                try {
                    const verifyResponse = await axiosInstance.post(
                        "/payment/verify-payment",
                        {
                            userid: userId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planType: selectedPlan,
                        }
                    );

                    if (verifyResponse.data.success) {
                        toast.success("✓ Premium activated successfully!");
                        onSuccess();
                        onClose();
                    }
                } catch (err: any) {
                    const errorMsg =
                        err.response?.data?.message || "Payment verification failed";
                    setError(errorMsg);
                    toast.error(errorMsg);
                }
            },
            prefill: {
                name: "User",
                email: "user@example.com",
            },
            theme: {
                color: "#8b5cf6",
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-white">
                        <Crown className="w-6 h-6" />
                        <h2 className="text-2xl font-bold">Go Premium</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Plan Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-3 text-gray-700">
                            Select Plan:
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(plans).map(([key, plan]) => (
                                <button
                                    key={key}
                                    onClick={() =>
                                        setSelectedPlan(key as "monthly" | "yearly")
                                    }
                                    className={`p-4 rounded-lg border-2 transition-all ${selectedPlan === key
                                        ? "border-purple-500 bg-purple-50"
                                        : "border-gray-200 bg-white hover:border-purple-300"
                                        }`}
                                >
                                    <div className="text-lg font-bold text-gray-900">
                                        ₹{plan.price}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">{plan.name}</div>
                                    {key === "yearly" && (
                                        <div className="text-xs font-semibold text-green-600 mt-1">
                                            {plan?.savings}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Plan Benefits */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">What's Included:</h3>
                        <ul className="space-y-2">
                            {currentPlan.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-gray-700">
                                    <span className="text-green-500 font-bold">✓</span>
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pricing Summary */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-semibold">₹{currentPlan.price}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">GST (18%):</span>
                            <span className="font-semibold">
                                ₹{Math.round(currentPlan.price * 0.18)}
                            </span>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                            <span className="font-bold">Total Amount:</span>
                            <span className="font-bold text-purple-600">
                                ₹{currentPlan.price + Math.round(currentPlan.price * 0.18)}
                            </span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                        onClick={handlePayment}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold gap-2"
                    >
                        {loading ? "Processing..." : "Continue to Payment"}
                        {!loading && <Crown className="w-4 h-4" />}
                    </Button>

                    {/* Security Note */}
                    <p className="text-center text-xs text-gray-500 mt-4">
                        💳 Secure payment powered by Razorpay. Your payment information is
                        encrypted.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PremiumCheckout;
