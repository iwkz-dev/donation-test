"use client";

import type { DonationPackage } from "@/types/api";
import { DonationCard } from "./DonationCard";

interface DonationListProps {
    packages: DonationPackage[];
}

export function DonationList({ packages }: DonationListProps) {
    return (
        <section className="animate-slide-up py-4">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-1.5 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                        Program Pilihan
                    </h2>
                </div>
            </div>

            {/* The Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {packages.map((pkg, index) => (
                    <DonationCard key={pkg.id} donationPackage={pkg} index={index} />
                ))}
            </div>
        </section>
    );
}
