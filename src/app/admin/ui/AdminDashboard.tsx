'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { fetchDonationPackages, recordBankTransfer } from '@/lib/api';
import type { DonationPackage } from '@/types/api';

interface FlatItem {
    id: string;
    title: string;
    uniqueCode: string;
    price: number;
    requireDonatorInfo?: boolean;
}

interface TransferRow {
    id: string;
    donation_code: string;
    total_order: number | '';
    total_price: number;
    donator_info: string;
}

function useAuth() {
    const [authed, setAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [checking, setChecking] = useState(false);

    const submit = () => {
        const envPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
        if (!envPass) {
            toast.error('Admin password not configured.');
            return;
        }
        setChecking(true);
        setTimeout(() => {
            if (password === envPass) {
                setAuthed(true);
            } else {
                toast.error('Invalid password.');
            }
            setChecking(false);
        }, 250);
    };

    return { authed, password, setPassword, checking, submit };
}

function flattenPackages(packages: DonationPackage[]): FlatItem[] {
    const items: FlatItem[] = [];
    packages.forEach((pkg) => {
        pkg.donationItems.forEach((item) => {
            if (item.price == null) return;
            items.push({
                id: `${pkg.id}-${item.id}`,
                title: `${pkg.title} — ${item.title}`,
                uniqueCode: item.uniqueCode,
                price: item.price,
                requireDonatorInfo: item.requireDonatorInfo,
            });
        });
    });
    return items;
}

export default function AdminDashboard() {
    const auth = useAuth();
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<TransferRow[]>([
        {
            id: crypto.randomUUID(),
            donation_code: '',
            total_order: '',
            total_price: 0,
            donator_info: '',
        },
    ]);
    const [items, setItems] = useState<FlatItem[]>([]);
    const [packages, setPackages] = useState<DonationPackage[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [packageFilter, setPackageFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [packagesLoading, setPackagesLoading] = useState(false);

    const totalSubmission = useMemo(
        () => rows.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0),
        [rows],
    );

    const handleLoadPackages = async () => {
        setPackagesLoading(true);
        try {
            const res = await fetchDonationPackages();
            const flat = flattenPackages(res.data.donationPackages);
            setPackages(res.data.donationPackages);
            setItems(flat);
            toast.success('Packages loaded');
        } catch (err) {
            console.error(err);
            toast.error('Failed to load packages');
        } finally {
            setPackagesLoading(false);
        }
    };

    const updateRow = (
        id: string,
        updater: (row: TransferRow) => TransferRow,
    ) => {
        setRows((prev) => prev.map((r) => (r.id === id ? updater(r) : r)));
    };

    const addRow = () => {
        setRows((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                donation_code: '',
                total_order: '',
                total_price: 0,
                donator_info: '',
            },
        ]);
    };

    const removeRow = (id: string) => {
        setRows((prev) =>
            prev.length === 1 ? prev : prev.filter((r) => r.id !== id),
        );
    };

    const onItemChange = (id: string, donation_code: string) => {
        const item = items.find((i) => i.uniqueCode === donation_code);
        updateRow(id, (row) => {
            const qtyNum = Number(row.total_order) || 0;
            const price = item ? item.price * qtyNum : 0;
            return {
                ...row,
                donation_code,
                total_price: price,
                donator_info: item?.requireDonatorInfo ? row.donator_info : '',
            };
        });
    };

    const onQtyChange = (id: string, qty: string) => {
        const qtyNum = Number(qty) || '';
        const item = rows.find((r) => r.id === id)?.donation_code;
        const sel = items.find((i) => i.uniqueCode === item);
        updateRow(id, (row) => ({
            ...row,
            total_order: qtyNum,
            total_price: sel && qtyNum !== '' ? sel.price * Number(qtyNum) : 0,
        }));
    };

    const handleSubmit = async () => {
        const payload = {
            items: rows
                .filter((r) => r.donation_code && r.total_order !== '')
                .map((r) => ({
                    donation_code: r.donation_code,
                    total_order: Number(r.total_order),
                    total_price: Number(r.total_price),
                    description: r.donator_info.trim() || undefined,
                })),
        };

        if (!payload.items.length) {
            toast.error('Add at least one valid item.');
            return;
        }

        for (const r of rows) {
            if (!r.donation_code || r.total_order === '') continue;
            const item = items.find((i) => i.uniqueCode === r.donation_code);
            if (item?.requireDonatorInfo && !r.donator_info.trim()) {
                toast.error(
                    'Please fill Donator Info for items that require it.',
                );
                return;
            }
        }

        setLoading(true);
        try {
            const res = await recordBankTransfer(payload);
            if (!res.ok) throw new Error('Failed to save');
            toast.success('Saved transfer entry');
            setRows([
                {
                    id: crypto.randomUUID(),
                    donation_code: '',
                    total_order: '',
                    total_price: 0,
                    donator_info: '',
                },
            ]);
        } catch (err) {
            console.error(err);
            toast.error('Save failed');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCsv = () => {
        if (!packages.length) {
            toast.error('Load packages first.');
            return;
        }
        if (!selectedPackageId) {
            toast.error('Choose a package to export.');
            return;
        }

        const pkg = packages.find((p) => String(p.id) === selectedPackageId);
        if (!pkg) {
            toast.error('Package not found.');
            return;
        }

        const header = [
            'package_title',
            'item_title',
            'item_unique_code',
            'item_total_order',
            'item_total_donation',
        ];

        const rows = pkg.donationItems.map((item) => [
            pkg.title,
            item.title,
            item.uniqueCode,
            item.total_order ?? '',
            item.total_donation ?? '',
        ]);

        const escape = (val: string | number) => {
            const str = val === null || val === undefined ? '' : String(val);
            if (/[,"\n]/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csv = [header, ...rows]
            .map((r) => r.map(escape).join(','))
            .join('\n');

        const blob = new Blob([csv], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${pkg.title.replace(/\s+/g, '_')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported');
    };

    const filteredPackages = useMemo(() => {
        const q = packageFilter.trim().toLowerCase();
        if (!q) return packages;
        return packages.filter((p) => p.title.toLowerCase().includes(q));
    }, [packages, packageFilter]);

    const tableRows = useMemo(() => {
        const rows: Array<{
            packageTitle: string;
            itemTitle: string;
            uniqueCode: string;
            totalOrder: number | '' | undefined;
            totalDonation: number | '' | undefined;
            requireDonatorInfo?: boolean;
        }> = [];
        filteredPackages.forEach((pkg) => {
            pkg.donationItems.forEach((item) => {
                rows.push({
                    packageTitle: pkg.title,
                    itemTitle: item.title,
                    uniqueCode: item.uniqueCode,
                    totalOrder: item.total_order,
                    totalDonation: item.total_donation,
                    requireDonatorInfo: item.requireDonatorInfo,
                });
            });
        });
        return rows;
    }, [filteredPackages]);

    const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
    const pagedRows = tableRows.slice((page - 1) * pageSize, page * pageSize);

    const goPage = (target: number) => {
        setPage(Math.min(Math.max(1, target), totalPages));
    };

    if (!auth.authed) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
                    <h1 className="text-lg font-semibold text-slate-900">
                        Admin Login
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Enter the admin password to continue.
                    </p>
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                type="password"
                                value={auth.password}
                                onChange={(e) =>
                                    auth.setPassword(e.target.value)
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            onClick={auth.submit}
                            disabled={auth.checking}
                            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                        >
                            {auth.checking ? 'Checking...' : 'Enter'}
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Data Donasi IWKZ e.V. - Admin Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleLoadPackages}
                            disabled={packagesLoading}
                            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-400 disabled:opacity-60"
                        >
                            {packagesLoading ? 'Loading...' : 'Load Packages'}
                        </button>
                    </div>
                </header>

                {/* Update Bank Transfer */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Update Data Bank Transfer
                            </h2>
                            <p className="text-sm text-slate-500">
                                update data manual dari bank transfer yang
                                masuk, pastikan data sudah benar sebelum submit.
                            </p>
                        </div>
                        <div className="text-right text-sm font-semibold text-slate-700">
                            Total: € {totalSubmission.toFixed(2)}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {rows.map((row, idx) => {
                            const selectedItem = items.find(
                                (i) => i.uniqueCode === row.donation_code,
                            );
                            const needsInfo = selectedItem?.requireDonatorInfo;
                            return (
                                <div
                                    key={row.id}
                                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-4 sm:flex-row sm:items-end"
                                >
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-slate-700">
                                            Donation Item
                                        </label>
                                        <select
                                            value={row.donation_code}
                                            onChange={(e) =>
                                                onItemChange(
                                                    row.id,
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                        >
                                            <option value="">
                                                Select package
                                            </option>
                                            {items.map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.uniqueCode}
                                                >
                                                    {item.title} —{' '}
                                                    {item.uniqueCode} (€{' '}
                                                    {item.price.toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                        {needsInfo && (
                                            <div className="mt-2">
                                                <label className="text-xs font-medium text-amber-700">
                                                    Donator Info (required)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={row.donator_info}
                                                    onChange={(e) =>
                                                        updateRow(
                                                            row.id,
                                                            (prev) => ({
                                                                ...prev,
                                                                donator_info:
                                                                    e.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    placeholder="e.g. Family name, student name"
                                                    className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="sm:w-28">
                                        <label className="text-sm font-medium text-slate-700">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={row.total_order}
                                            onChange={(e) =>
                                                onQtyChange(
                                                    row.id,
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                        />
                                    </div>
                                    <div className="sm:w-32">
                                        <label className="text-sm font-medium text-slate-700">
                                            Total Price
                                        </label>
                                        <input
                                            type="text"
                                            value={`€ ${row.total_price.toFixed(2)}`}
                                            readOnly
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600"
                                        >
                                            Remove
                                        </button>
                                        {idx === rows.length - 1 && (
                                            <button
                                                type="button"
                                                onClick={addRow}
                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                                            >
                                                Add
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                        >
                            {loading ? 'Saving...' : 'Save / Update'}
                        </button>
                    </div>
                </section>

                {/* Export Data */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Export Data
                            </h2>
                            <p className="text-sm text-slate-500">
                                Pilih paket donasi untuk mengekspor data
                                item-item donasi dalam format CSV.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedPackageId}
                                onChange={(e) =>
                                    setSelectedPackageId(e.target.value)
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            >
                                <option value="">Select package</option>
                                {packages.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.title} (#{pkg.id})
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <input
                                type="text"
                                value={packageFilter}
                                onChange={(e) => {
                                    setPackageFilter(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Filter by package title"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:max-w-xs"
                            />
                            <p className="text-sm text-slate-500">
                                Showing {pagedRows.length} of {tableRows.length}{' '}
                                items
                            </p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-100">
                            <div className="grid grid-cols-6 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <div className="col-span-2">Package</div>
                                <div>Item</div>
                                <div>Unique Code</div>
                                <div className="text-center">Needs Info</div>
                                <div className="text-right">Totals</div>
                            </div>
                            <div>
                                {pagedRows.map((row, idx) => (
                                    <div
                                        key={`${row.uniqueCode}-${idx}`}
                                        className="grid grid-cols-6 gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-700"
                                    >
                                        <div className="col-span-2 font-medium">
                                            {row.packageTitle}
                                        </div>
                                        <div>{row.itemTitle}</div>
                                        <div className="font-mono text-xs text-slate-600">
                                            {row.uniqueCode}
                                        </div>
                                        <div className="text-center text-xs">
                                            {row.requireDonatorInfo
                                                ? 'Yes'
                                                : 'No'}
                                        </div>
                                        <div className="text-right text-xs text-slate-600">
                                            <div>
                                                Orders: {row.totalOrder ?? '-'}
                                            </div>
                                            <div>
                                                Donation:{' '}
                                                {row.totalDonation ?? '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!pagedRows.length && (
                                    <div className="border-t border-slate-100 px-3 py-6 text-center text-sm text-slate-500">
                                        No items match this filter.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => goPage(page - 1)}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-slate-200 px-3 py-1 font-semibold transition hover:border-slate-300 disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-slate-200 px-3 py-1 font-semibold transition hover:border-slate-300 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
