"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Icon } from "./DemoComponents";
import { BillSummary, Bill } from "@/lib/types";

interface BillHistoryProps {
  userFid: number;
  onBillSelect?: (bill: Bill) => void;
}

export function BillHistory({ userFid, onBillSelect }: BillHistoryProps) {
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bills?fid=${userFid}`);
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills);
      } else {
        throw new Error('Failed to load bills');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userFid]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleBillClick = useCallback(async (billSummary: BillSummary) => {
    if (!onBillSelect) return;

    try {
      const response = await fetch(`/api/bills/${billSummary.id}`);
      if (response.ok) {
        const data = await response.json();
        onBillSelect(data.bill);
      }
    } catch (error) {
      console.error('Failed to load bill details:', error);
    }
  }, [onBillSelect]);

  const filteredBills = bills.filter(bill => {
    if (filter === 'all') return true;
    if (filter === 'pending') return bill.status !== 'completed';
    if (filter === 'completed') return bill.status === 'completed';
    return true;
  });

  const getStatusColor = (status: Bill['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
      case 'collecting':
        return 'text-orange-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-[var(--app-foreground-muted)]';
    }
  };

  const getStatusIcon = (status: Bill['status']) => {
    switch (status) {
      case 'completed':
        return <Icon name="check" size="sm" className="text-green-600" />;
      case 'pending':
      case 'collecting':
        return <Icon name="star" size="sm" className="text-orange-600" />;
      case 'cancelled':
        return <span className="text-red-600 text-sm">✕</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--app-foreground-muted)]">Loading bills...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Failed to load bills: {error}</p>
        <Button variant="outline" onClick={loadBills}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Bills</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadBills}
          icon={<Icon name="arrow-right" size="sm" />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({bills.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending ({bills.filter(b => b.status !== 'completed').length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed ({bills.filter(b => b.status === 'completed').length})
        </Button>
      </div>

      {filteredBills.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="star" size="lg" className="text-[var(--app-foreground-muted)] mx-auto mb-4" />
          <p className="text-[var(--app-foreground-muted)] mb-2">
            {filter === 'all' 
              ? "No bills yet"
              : `No ${filter} bills`
            }
          </p>
          <p className="text-sm text-[var(--app-foreground-muted)]">
            Create your first bill to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map(bill => (
            <div
              key={bill.id}
              className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)] hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleBillClick(bill)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--app-foreground)] mb-1">
                    {bill.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-[var(--app-foreground-muted)]">
                    {getStatusIcon(bill.status)}
                    <span className={getStatusColor(bill.status)}>
                      {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                    </span>
                    <span>•</span>
                    <span>{bill.participantCount} people</span>
                    {bill.isCreator && (
                      <>
                        <span>•</span>
                        <span className="text-[var(--app-accent)]">Creator</span>
                      </>
                    )}
                  </div>
                </div>
                <Icon name="arrow-right" size="sm" className="text-[var(--app-foreground-muted)] mt-1" />
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-[var(--app-foreground-muted)]">
                    Total: {bill.totalAmount.toFixed(2)} zł
                  </p>
                  <p className="text-sm font-medium text-[var(--app-accent)]">
                    Your share: {bill.yourShare.toFixed(2)} zł
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--app-foreground-muted)]">
                    {new Date(bill.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {bills.length > 0 && (
        <div className="pt-4 border-t border-[var(--app-card-border)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--app-accent)]">
                {bills.reduce((sum, bill) => sum + bill.totalAmount, 0).toFixed(2)}
              </p>
              <p className="text-sm text-[var(--app-foreground-muted)]">
                Total bills amount
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--app-accent)]">
                {bills.reduce((sum, bill) => sum + bill.yourShare, 0).toFixed(2)}
              </p>
              <p className="text-sm text-[var(--app-foreground-muted)]">
                Your total share
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick Bill Stats Component
interface BillStatsProps {
  userFid: number;
}

export function BillStats({ userFid }: BillStatsProps) {
  const [stats, setStats] = useState({
    totalBills: 0,
    pendingBills: 0,
    completedBills: 0,
    totalOwed: 0,
    totalPaid: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`/api/bills?fid=${userFid}`);
        if (response.ok) {
          const data = await response.json();
          const bills: BillSummary[] = data.bills;
          
          const newStats = {
            totalBills: bills.length,
            pendingBills: bills.filter(b => b.status !== 'completed').length,
            completedBills: bills.filter(b => b.status === 'completed').length,
            totalOwed: bills.reduce((sum, bill) => sum + bill.yourShare, 0),
            totalPaid: bills
              .filter(b => b.status === 'completed')
              .reduce((sum, bill) => sum + bill.yourShare, 0),
          };
          
          setStats(newStats);
        }
      } catch (error) {
        console.error('Failed to load bill stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [userFid]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--app-card-bg)] p-4 rounded-lg animate-pulse">
            <div className="h-8 bg-[var(--app-gray)] rounded mb-2"></div>
            <div className="h-4 bg-[var(--app-gray)] rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[var(--app-card-bg)] p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-[var(--app-accent)]">{stats.totalBills}</p>
        <p className="text-sm text-[var(--app-foreground-muted)]">Total Bills</p>
      </div>
      <div className="bg-[var(--app-card-bg)] p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-orange-600">{stats.pendingBills}</p>
        <p className="text-sm text-[var(--app-foreground-muted)]">Pending</p>
      </div>
      <div className="bg-[var(--app-card-bg)] p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-green-600">{stats.totalPaid.toFixed(2)}</p>
        <p className="text-sm text-[var(--app-foreground-muted)]">Paid (zł)</p>
      </div>
      <div className="bg-[var(--app-card-bg)] p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-red-600">{(stats.totalOwed - stats.totalPaid).toFixed(2)}</p>
        <p className="text-sm text-[var(--app-foreground-muted)]">Owed (zł)</p>
      </div>
    </div>
  );
}


